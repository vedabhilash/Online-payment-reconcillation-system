const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireAdmin, requireCustomer } = auth;
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');

// GET /api/reports/dashboard (Admin Dashboard)
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const invoices = await Invoice.find({ userId: req.userId });

        let totalRevenue = invoices.reduce((sum, inv) => sum + (inv.status === 'Paid' ? inv.totalAmount : 0), 0);
        let totalInvoices = invoices.length;
        let paidInvoices = invoices.filter(i => i.status === 'Paid').length;
        let unpaidInvoices = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Cancelled').length;

        // Recent transactions
        const recentTransactions = await Transaction.find({ userId: req.userId })
            .sort({ date: -1 })
            .limit(5);

        res.json({
            totalRevenue,
            totalInvoices,
            paidInvoices,
            unpaidInvoices,
            recentTransactions
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/customer-dashboard (Customer Dashboard)
router.get('/customer-dashboard', requireCustomer, async (req, res) => {
    try {
        const customerProfiles = await Customer.find({ loginUserId: req.userId });
        if (!customerProfiles.length) return res.json({
            outstandingBalance: 0,
            totalInvoices: 0,
            paidInvoices: 0,
            pendingInvoices: 0,
            recentInvoices: []
        });

        const customerIds = customerProfiles.map(p => p._id);
        const invoices = await Invoice.find({ customerId: { $in: customerIds } }).sort({ issueDate: -1 });

        let outstandingBalance = invoices
            .filter(i => i.status !== 'Paid' && i.status !== 'Cancelled')
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        let totalInvoices = invoices.length;
        let paidInvoices = invoices.filter(i => i.status === 'Paid').length;
        let pendingInvoices = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Cancelled').length;

        const recentInvoices = invoices.slice(0, 5);

        res.json({
            outstandingBalance,
            totalInvoices,
            paidInvoices,
            pendingInvoices,
            recentInvoices
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
