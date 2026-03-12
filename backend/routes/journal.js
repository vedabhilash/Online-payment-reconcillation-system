const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const Account = require('../models/Account');

// GET /api/journal
router.get('/', auth, async (req, res) => {
    try {
        const entries = await JournalEntry.find({ userId: req.userId }).sort({ date: -1 });
        const entryIds = entries.map(e => e._id);
        const allLines = await JournalLine.find({ journalEntryId: { $in: entryIds } }).populate('accountId', 'accountName accountType');

        // Group lines by entry
        const formatted = entries.map(e => {
            const lines = allLines.filter(l => l.journalEntryId.toString() === e._id.toString());
            return {
                ...e.toObject(),
                lines
            };
        });

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/journal (Create a manual journal entry, requires balancing)
router.post('/', auth, async (req, res) => {
    try {
        const { date, description, referenceNumber, lines } = req.body;

        // 1. Balance check
        let totalDebits = 0;
        let totalCredits = 0;
        for (const line of lines) {
            if (line.type === 'Debit') totalDebits += Number(line.amount);
            if (line.type === 'Credit') totalCredits += Number(line.amount);
        }

        // JS floating point math check
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            throw new Error(`Journal entry must balance. Debits: ${totalDebits}, Credits: ${totalCredits}`);
        }

        // 2. Create Entry
        const entry = await JournalEntry.create([{
            userId: req.userId,
            date, description, referenceNumber
        }]);

        // 3. Create Lines & Update Account Balances
        const lineDocs = lines.map(line => ({
            journalEntryId: entry[0]._id,
            userId: req.userId,
            accountId: line.accountId,
            type: line.type,
            amount: Number(line.amount),
            description: line.description
        }));
        await JournalLine.insertMany(lineDocs);

        // Account balances update logic (Normal balances: Asset/Expense=Debit, Liability/Equity/Revenue=Credit)
        for (const line of lines) {
            const account = await Account.findById(line.accountId);
            let impact = 0;
            if (['Asset', 'Expense'].includes(account.accountType)) {
                impact = line.type === 'Debit' ? line.amount : -line.amount;
            } else {
                impact = line.type === 'Credit' ? line.amount : -line.amount;
            }
            await Account.findByIdAndUpdate(line.accountId, { $inc: { balance: impact } });
        }

        res.json({ message: 'Journal Entry created successfully', entry: entry[0] });

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
