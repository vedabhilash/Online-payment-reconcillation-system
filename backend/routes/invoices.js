const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { requireAdmin, requireCustomer } = auth;
const Invoice = require('../models/Invoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const Customer = require('../models/Customer');

// GET /api/invoices/customer
router.get('/customer', requireCustomer, async (req, res) => {
    try {
        const customerProfiles = await Customer.find({ loginUserId: req.userId });
        if (!customerProfiles.length) return res.json([]);

        const customerIds = customerProfiles.map(p => p._id);
        const invoices = await Invoice.find({ customerId: { $in: customerIds } })
            .populate('customerId', 'name')
            .populate('userId', 'displayName email')
            .sort({ issueDate: -1 });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices
router.get('/', requireAdmin, async (req, res) => {
    try {
        const invoices = await Invoice.find({ userId: req.userId }).populate('customerId', 'name').sort({ issueDate: -1 });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/:id (includes line items)
router.get('/:id', requireAdmin, async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.userId }).populate('customerId');
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const lines = await InvoiceLineItem.find({ invoiceId: invoice._id });
        res.json({ ...invoice.toObject(), lines });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/invoices
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { customerId, invoiceNumber, issueDate, dueDate, status, notes, lines } = req.body;

        // Calculate totals based on lines
        let subtotal = 0;
        let taxTotal = 0;
        const lineDocsData = lines.map(l => {
            const amount = Number(l.quantity) * Number(l.unitPrice);
            const lineTax = amount * (Number(l.taxRate) || 0) / 100;
            subtotal += amount;
            taxTotal += lineTax;
            return {
                userId: req.userId,
                description: l.description,
                quantity: Number(l.quantity),
                unitPrice: Number(l.unitPrice),
                taxRate: Number(l.taxRate),
                accountId: l.accountId || null,
                amount
            };
        });

        const totalAmount = subtotal + taxTotal;

        // Create the invoice header
        const invoiceArr = await Invoice.create([{
            userId: req.userId,
            customerId, invoiceNumber, issueDate, dueDate, status, notes,
            subtotal, taxTotal, totalAmount
        }]);

        const invoiceId = invoiceArr[0]._id;

        // Attach invoice ID to lines and insert
        for (const line of lineDocsData) {
            line.invoiceId = invoiceId;
        }
        await InvoiceLineItem.insertMany(lineDocsData);

        res.status(201).json(invoiceArr[0]);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
