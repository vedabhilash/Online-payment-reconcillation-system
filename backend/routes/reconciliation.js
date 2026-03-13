const router = require('express').Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const ReconciliationRun = require('../models/ReconciliationRun');
const Match = require('../models/Match');
const AuditLog = require('../models/AuditLog');
const UploadBatch = require('../models/UploadBatch');

// GET /api/reconciliation/runs
router.get('/runs', auth, async (req, res) => {
    try {
        const runs = await ReconciliationRun.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(runs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/reconciliation/run
router.post('/run', auth, async (req, res) => {
    try {
        const { sourceA, sourceB, dateTolerance, amountTolerance } = req.body;

        if (sourceA === sourceB) {
            return res.status(400).json({ error: 'Source A and B must be different' });
        }

        // Scope reconciliation to the most recent upload batch for each source
        // This ensures results reflect the "current" work rather than every unmatched record in history
        const [lastBatchA, lastBatchB] = await Promise.all([
            UploadBatch.findOne({ userId: req.userId, source: sourceA }).sort({ createdAt: -1 }),
            UploadBatch.findOne({ userId: req.userId, source: sourceB }).sort({ createdAt: -1 })
        ]);

        const queryA = { userId: req.userId, source: sourceA, status: 'unmatched' };
        if (lastBatchA) queryA.uploadBatchId = lastBatchA._id;

        const queryB = { userId: req.userId, source: sourceB, status: 'unmatched' };
        if (lastBatchB) queryB.uploadBatchId = lastBatchB._id;

        const [txA, txB] = await Promise.all([
            Transaction.find(queryA),
            Transaction.find(queryB),
        ]);

        if (!txA.length || !txB.length) {
            return res.status(400).json({ error: 'Need unmatched transactions in both sources' });
        }

        const run = await ReconciliationRun.create({
            userId: req.userId,
            sourceA,
            sourceB,
            dateTolerance,
            amountTolerance,
            totalCompared: txA.length + txB.length,
            status: 'running',
        });

        // Matching algorithm
        const matchedA = new Set();
        const matchedB = new Set();
        const matches = [];
        const discrepancies = [];

        for (const a of txA) {
            if (matchedA.has(a._id.toString())) continue;
            for (const b of txB) {
                if (matchedB.has(b._id.toString())) continue;

                const amountDiff = Math.abs(a.amount - b.amount);
                const daysDiff = Math.abs((new Date(a.transactionDate) - new Date(b.transactionDate)) / (1000 * 60 * 60 * 24));

                if (amountDiff <= amountTolerance && daysDiff <= dateTolerance) {
                    const confidence = amountDiff === 0 && daysDiff === 0 ? 100 : Math.max(50, 100 - amountDiff - daysDiff * 5);
                    matches.push({ userId: req.userId, runId: run._id, transactionAId: a._id, transactionBId: b._id, confidence, matchType: 'auto', status: 'pending' });
                    matchedA.add(a._id.toString());
                    matchedB.add(b._id.toString());
                    break;
                } else if (amountDiff <= amountTolerance * 3 && daysDiff <= dateTolerance * 2) {
                    discrepancies.push({ userId: req.userId, runId: run._id, transactionAId: a._id, transactionBId: b._id, confidence: Math.max(20, 60 - amountDiff - daysDiff * 3), matchType: 'auto', status: 'pending' });
                    matchedA.add(a._id.toString());
                    matchedB.add(b._id.toString());
                    break;
                }
            }
        }

        if (matches.length) {
            await Match.insertMany(matches);
            const ids = matches.flatMap(m => [m.transactionAId, m.transactionBId]);
            await Transaction.updateMany({ _id: { $in: ids } }, { status: 'matched' });
        }

        if (discrepancies.length) {
            await Match.insertMany(discrepancies);
            const ids = discrepancies.flatMap(m => [m.transactionAId, m.transactionBId]);
            await Transaction.updateMany({ _id: { $in: ids } }, { status: 'discrepancy' });
        }

        const unmatchedCount = Math.max(0, txA.length + txB.length - matches.length * 2 - discrepancies.length * 2);

        await ReconciliationRun.findByIdAndUpdate(run._id, {
            matchedCount: matches.length,
            unmatchedCount,
            discrepancyCount: discrepancies.length,
            status: 'completed',
            completedAt: new Date(),
        });

        await AuditLog.create({
            userId: req.userId,
            action: 'reconciliation_run',
            entityType: 'reconciliation_run',
            entityId: run._id,
            details: { matched: matches.length, discrepancies: discrepancies.length, unmatched: unmatchedCount },
        });

        res.json({
            runId: run._id,
            batchAId: lastBatchA ? lastBatchA._id : null,
            batchBId: lastBatchB ? lastBatchB._id : null,
            matched: matches.length,
            unmatched: unmatchedCount,
            discrepancy: discrepancies.length,
            total: txA.length + txB.length,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
