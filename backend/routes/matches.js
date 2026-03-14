const router = require('express').Router();
const auth = require('../middleware/auth');
const Match = require('../models/Match');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');

// GET /api/matches - pending matches with populated transactions
router.get('/', auth, async (req, res) => {
    try {
        const { runId } = req.query;
        const query = { userId: req.userId, status: 'pending' };
        if (runId) query.runId = runId;

        const matches = await Match.find(query)
            .populate('transactionAId', 'source amount transactionDate description referenceId')
            .populate('transactionBId', 'source amount transactionDate description referenceId')
            .sort({ confidence: -1 });

        // Format for frontend compatibility
        const formatted = matches.map(m => ({
            id: m._id,
            confidence: m.confidence,
            match_type: m.matchType,
            status: m.status,
            notes: m.notes,
            transaction_a: m.transactionAId ? {
                id: m.transactionAId._id,
                source: m.transactionAId.source,
                amount: m.transactionAId.amount,
                transaction_date: m.transactionAId.transactionDate,
                description: m.transactionAId.description,
                reference_id: m.transactionAId.referenceId,
            } : null,
            transaction_b: m.transactionBId ? {
                id: m.transactionBId._id,
                source: m.transactionBId.source,
                amount: m.transactionBId.amount,
                transaction_date: m.transactionBId.transactionDate,
                description: m.transactionBId.description,
                reference_id: m.transactionBId.referenceId,
            } : null,
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/matches/:id
router.patch('/:id', auth, async (req, res) => {
    try {
        const { action, notes } = req.body;
        const match = await Match.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { status: action, notes: notes || null },
            { new: true }
        );
        if (!match) return res.status(404).json({ error: 'Match not found' });

        if (action === 'rejected') {
            await Transaction.updateMany(
                { _id: { $in: [match.transactionAId, match.transactionBId] } },
                { status: 'unmatched' }
            );
        }

        await AuditLog.create({
            userId: req.userId,
            action: `match_${action}`,
            entityType: 'match',
            entityId: match._id,
            details: { notes },
        });

        res.json(match);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/matches/bulk-approve
router.post('/bulk-approve', auth, async (req, res) => {
    try {
        const pending = await Match.find({ userId: req.userId, status: 'pending' });
        const ids = pending.map(m => m._id);
        await Match.updateMany({ _id: { $in: ids } }, { status: 'approved' });

        await AuditLog.create({
            userId: req.userId,
            action: 'bulk_approve',
            entityType: 'match',
            details: { count: ids.length },
        });

        res.json({ approved: ids.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
