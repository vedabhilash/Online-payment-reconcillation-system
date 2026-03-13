const router = require('express').Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const ReconciliationRun = require('../models/ReconciliationRun');
const Match = require('../models/Match');
const Discrepancy = require('../models/Discrepancy');
const AuditLog = require('../models/AuditLog');
const UploadBatch = require('../models/UploadBatch');
const { reconcileTransactions } = require('../services/reconciliationEngine');

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
            batchAId: lastBatchA ? lastBatchA._id : null,
            batchBId: lastBatchB ? lastBatchB._id : null,
            status: 'running',
        });

        // Use the new Reconciliation Engine
        const engineResult = reconcileTransactions(txA, txB, { dateTolerance, amountTolerance });
        
        const matches = [];
        const discrepanciesToSave = [];
        const timingDifferences = [];

        // Process perfect matches and timing differences
        engineResult.matches.forEach(m => {
            const matchData = {
                userId: req.userId,
                runId: run._id,
                transactionAId: m.bankTransaction._id,
                transactionBId: m.gatewayTransaction._id,
                confidence: 100,
                matchType: m.type === 'reference' ? 'reference' : 'auto',
                status: 'pending'
            };
            matches.push(matchData);
            if (m.type === 'timing_difference') timingDifferences.push(m);
        });

        // Process discrepancies (amount mismatches)
        engineResult.discrepancies.forEach(d => {
            discrepanciesToSave.push({
                userId: req.userId,
                runId: run._id,
                transactionAId: d.bankTransaction._id,
                transactionBId: d.gatewayTransaction._id,
                type: 'amount_mismatch',
                difference: d.discrepancy.difference,
                status: 'unresolved'
            });
        });

        // Save matches to DB
        if (matches.length) {
            await Match.insertMany(matches);
            const ids = matches.flatMap(m => [m.transactionAId, m.transactionBId]);
            await Transaction.updateMany({ _id: { $in: ids } }, { status: 'matched' });
        }

        // Save discrepancies to DB
        if (discrepanciesToSave.length) {
            await Discrepancy.insertMany(discrepanciesToSave);
            const ids = discrepanciesToSave.flatMap(d => [d.transactionAId, d.transactionBId]);
            await Transaction.updateMany({ _id: { $in: ids } }, { status: 'discrepancy' });
        }

        const matchedCount = matches.length;
        const discrepancyCount = discrepanciesToSave.length;
        const timingDiffCount = timingDifferences.length;
        const unmatchedCount = engineResult.unmatchedBank.length + engineResult.unmatchedGateway.length;

        await ReconciliationRun.findByIdAndUpdate(run._id, {
            matchedCount,
            unmatchedCount,
            discrepancyCount,
            timingDifferenceCount: timingDiffCount,
            status: 'completed',
            completedAt: new Date(),
        });

        await AuditLog.create({
            userId: req.userId,
            action: 'reconciliation_run',
            entityType: 'reconciliation_run',
            entityId: run._id,
            details: { matched: matchedCount, discrepancies: discrepancyCount, timingDiff: timingDiffCount, unmatched: unmatchedCount },
        });

        res.json({
            runId: run._id,
            matched: matchedCount,
            unmatched: unmatchedCount,
            discrepancy: discrepancyCount,
            timingDifference: timingDiffCount,
            total: txA.length + txB.length,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/reconciliation/adjust (Manual Investigation & Actions)
router.post('/adjust', auth, async (req, res) => {
    try {
        const { transactionId, status, category, notes, runId } = req.body;

        const oldTx = await Transaction.findOne({ _id: transactionId, userId: req.userId });
        if (!oldTx) return res.status(404).json({ error: 'Transaction not found' });

        const tx = await Transaction.findOneAndUpdate(
            { _id: transactionId, userId: req.userId },
            { 
                status, 
                category, 
                adjustmentNotes: notes,
            },
            { new: true }
        );

        // Update ReconciliationRun counts if runId is provided
        if (runId) {
            const update = { $inc: { unmatchedCount: -1 } };
            if (status === 'timing_difference') update.$inc.timingDifferenceCount = 1;
            else if (status === 'adjusted') update.$inc.adjustedCount = 1;
            else if (status === 'exception') update.$inc.exceptionCount = 1;
            else if (status === 'matched') update.$inc.matchedCount = 1; // if manually matched

            await ReconciliationRun.findByIdAndUpdate(runId, update);
        }

        await AuditLog.create({
            userId: req.userId,
            action: 'manual_adjustment',
            entityType: 'transaction',
            entityId: tx._id,
            details: { status, category, notes },
        });

        res.json(tx);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/reconciliation/manual-match
router.post('/manual-match', auth, async (req, res) => {
    try {
        const { transactionAId, transactionBId, runId } = req.body;

        const [txA, txB] = await Promise.all([
            Transaction.findOne({ _id: transactionAId, userId: req.userId }),
            Transaction.findOne({ _id: transactionBId, userId: req.userId })
        ]);

        if (!txA || !txB) return res.status(404).json({ error: 'One or both transactions not found' });

        const match = await Match.create({
            userId: req.userId,
            runId,
            transactionAId,
            transactionBId,
            confidence: 100,
            matchType: 'manual',
            status: 'approved'
        });

        await Transaction.updateMany({ _id: { $in: [transactionAId, transactionBId] } }, { status: 'matched' });

        if (runId) {
            await ReconciliationRun.findByIdAndUpdate(runId, {
                $inc: { matchedCount: 1, unmatchedCount: -2 }
            });
        }

        res.json(match);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reconciliation/report/:runId
router.get('/report/:runId', auth, async (req, res) => {
    try {
        const { runId } = req.params;
        const [run, matches, discrepancies] = await Promise.all([
            ReconciliationRun.findOne({ _id: runId, userId: req.userId }),
            Match.find({ runId, userId: req.userId }).populate('transactionAId').populate('transactionBId'),
            Discrepancy.find({ runId, userId: req.userId }).populate('transactionAId').populate('transactionBId')
        ]);

        if (!run) return res.status(404).json({ error: 'Run not found' });

        // Get unmatched transactions related to this run's batches
        const unmatched = await Transaction.find({
            userId: req.userId,
            status: 'unmatched',
            uploadBatchId: { $in: [run.batchAId, run.batchBId].filter(Boolean) }
        });

        res.json({
            run,
            matches,
            discrepancies,
            unmatched
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
