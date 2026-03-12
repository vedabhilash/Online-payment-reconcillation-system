const router = require('express').Router();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const Account = require('../models/Account');

// POST /api/webhooks/stripe
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Verify webhook signature (Requires STRIPE_WEBHOOK_SECRET in .env)
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const invoiceId = session.metadata.invoiceId;
        const userId = session.metadata.userId;

        try {
            // 1. Mark invoice as paid
            const invoice = await Invoice.findByIdAndUpdate(invoiceId, { status: 'Paid' });

            if (!invoice) throw new Error('Invoice not found during webhook processing');

            // 2. Automated Journal Entry
            // We need 'Bank Account' and 'Accounts Receivable' for this user
            const cashAcc = await Account.findOne({ userId, accountName: 'Bank Account' });
            const arAcc = await Account.findOne({ userId, accountName: 'Accounts Receivable' });

            if (cashAcc && arAcc) {
                const amount = session.amount_total / 100; // From cents back to float

                // Create Journal Entry
                const journalEntry = await JournalEntry.create([{
                    userId,
                    date: new Date(),
                    description: `Payment for Invoice #${invoice.invoiceNumber}`,
                    referenceNumber: session.id, // Stripe Session ID
                    isSystemGenerated: true
                }]);

                // Debit Cash (Increase)
                const debitLine = {
                    journalEntryId: journalEntry[0]._id,
                    userId,
                    accountId: cashAcc._id,
                    type: 'Debit',
                    amount
                };

                // Credit A/R (Decrease)
                const creditLine = {
                    journalEntryId: journalEntry[0]._id,
                    userId,
                    accountId: arAcc._id,
                    type: 'Credit',
                    amount
                };

                await JournalLine.insertMany([debitLine, creditLine]);

                // Update Balances
                await Account.findByIdAndUpdate(cashAcc._id, { $inc: { balance: amount } });
                await Account.findByIdAndUpdate(arAcc._id, { $inc: { balance: -amount } });
            }

            console.log(`✅ Webhook Processed: Invoice ${invoiceId} marked Paid & Ledger Updated.`);
        } catch (error) {
            console.error('Error processing checkout.session.completed:', error);
            return res.status(500).end();
        }
    }

    res.json({ received: true });
});

module.exports = router;
