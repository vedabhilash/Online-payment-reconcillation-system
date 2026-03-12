const router = require('express').Router();
const auth = require('../middleware/auth');
const Account = require('../models/Account');

// Seed default chart of accounts if none exist for user
async function ensureDefaultAccounts(userId) {
    const existing = await Account.countDocuments({ userId });
    if (existing > 0) return;

    const defaults = [
        { accountName: 'Bank Account', accountType: 'Asset' },
        { accountName: 'Accounts Receivable', accountType: 'Asset' },
        { accountName: 'Accounts Payable', accountType: 'Liability' },
        { accountName: 'Owner\'s Equity', accountType: 'Equity' },
        { accountName: 'Expenses', accountType: 'Expense' }
    ];

    const docs = defaults.map(d => ({ ...d, userId }));
    await Account.insertMany(docs);
}

// GET /api/accounts
router.get('/', auth, async (req, res) => {
    try {
        await ensureDefaultAccounts(req.userId);
        const accounts = await Account.find({ userId: req.userId }).sort({ accountType: 1, accountName: 1 });
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/accounts
router.post('/', auth, async (req, res) => {
    try {
        const { accountName, accountType, accountNumber, currency } = req.body;
        const newAccount = await Account.create({
            userId: req.userId,
            accountName, accountType, accountNumber, currency
        });
        res.json(newAccount);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
