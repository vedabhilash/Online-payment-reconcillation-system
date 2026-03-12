const router = require('express').Router();
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const Account = require('../models/Account');

// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', auth, async (req, res) => {
    try {
        const { invoiceId } = req.body;
        // Find the invoice, either owned by the admin (userId) or assigned to the customer (loginUserId)
        const invoice = await Invoice.findById(invoiceId).populate('customerId');

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        let isAuthorized = false;
        if (req.userRole === 'ADMIN' && invoice.userId.toString() === req.userId) isAuthorized = true;
        if (req.userRole === 'CUSTOMER' && invoice.customerId.loginUserId && invoice.customerId.loginUserId.toString() === req.userId) isAuthorized = true;

        if (!isAuthorized) return res.status(403).json({ error: 'Unauthorized to pay this invoice' });

        if (invoice.status === 'Paid') return res.status(400).json({ error: 'Invoice is already paid' });

        const lines = await InvoiceLineItem.find({ invoiceId });

        const line_items = lines.map(line => ({
            price_data: {
                currency: 'usd', // hardcoded for now or use invoice setting
                product_data: {
                    name: line.description,
                },
                unit_amount: Math.round(line.unitPrice * 100), // Stripe expects cents
            },
            quantity: line.quantity,
        }));

        // Add tax if needed as a separate line item or use Stripe tax

        const base_url = process.env.FRONTEND_URL || 'http://localhost:8080';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${base_url}/${req.userRole === 'CUSTOMER' ? 'customer/invoices' : 'invoices'}?payment=success&invoiceId=${invoiceId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${base_url}/${req.userRole === 'CUSTOMER' ? 'customer/invoices' : 'invoices'}?payment=cancelled`,
            client_reference_id: invoice._id.toString(),
            customer_email: invoice.customerId?.email,
            metadata: {
                invoiceId: invoice._id.toString(),
                userId: invoice.userId.toString()
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (err) {
        console.error('Stripe Checkout Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/payments/verify
router.post('/verify', auth, async (req, res) => {
    try {
        const { sessionId, invoiceId } = req.body;

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        // If already paid (by webhook), just return success
        if (invoice.status === 'Paid') return res.json({ success: true, alreadyPaid: true });

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const userId = invoice.userId;
            await Invoice.findByIdAndUpdate(invoiceId, { status: 'Paid' });

            const cashAcc = await Account.findOne({ userId, accountName: 'Bank Account' });
            const arAcc = await Account.findOne({ userId, accountName: 'Accounts Receivable' });

            if (cashAcc && arAcc) {
                const amount = session.amount_total / 100;

                const journalEntry = await JournalEntry.create([{
                    userId,
                    date: new Date(),
                    description: `Payment for Invoice #${invoice.invoiceNumber}`,
                    referenceNumber: session.id,
                    isSystemGenerated: true
                }]);

                await JournalLine.insertMany([
                    { journalEntryId: journalEntry[0]._id, userId, accountId: cashAcc._id, type: 'Debit', amount },
                    { journalEntryId: journalEntry[0]._id, userId, accountId: arAcc._id, type: 'Credit', amount }
                ]);

                await Account.findByIdAndUpdate(cashAcc._id, { $inc: { balance: amount } });
                await Account.findByIdAndUpdate(arAcc._id, { $inc: { balance: -amount } });
            }

            return res.json({ success: true, verified: true });
        }

        return res.status(400).json({ error: 'Payment not successful yet' });
    } catch (err) {
        console.error('Verify Payment Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
