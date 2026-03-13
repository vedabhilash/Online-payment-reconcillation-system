const router = require('express').Router();
const multer = require('multer');
const extractPDFText = require('../lib/pdfExtract');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const UploadBatch = require('../models/UploadBatch');
const AuditLog = require('../models/AuditLog');

// Store file in memory (no disk writes needed)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCSVBuffer(buffer) {
    const text = buffer.toString('utf-8');
    const rows = text
        .split('\n')
        .map((r) => r.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
    const headers = rows[0];
    const data = rows.slice(1).filter((r) => r.some((c) => c));
    return { headers, data };
}

/**
 * Parse rows from the structured text produced by pdfExtract.
 *
 * pdfExtract groups BT blocks into tab-separated rows for table rows:
 *   "2026-02-01\tREF001\tPayment from ACME Corp\tCREDIT\t$1,500.00"
 *
 * Falls back to line-by-line amount+date scanning for other PDF layouts.
 */
function parsePDFText(text) {
    const lines = text.split('\n');
    const rows = [];

    // Strategy A: tab-separated rows from pdfExtract's block grouping
    // Format: "YYYY-MM-DD\tREF\tDescription\tCREDIT\t$amount"
    const tabDateRe = /^(\d{4}-\d{2}-\d{2})\t/;
    for (const line of lines) {
        if (!tabDateRe.test(line)) continue;
        const parts = line.split('\t');
        // parts: [date, ref, description, type?, $amount]
        const date = parts[0];
        const ref = parts[1] || null;
        const desc = parts[2] || null;
        // Find the amount part (starts with $)
        const amtPart = parts.find(p => /^\$/.test(p));
        if (!amtPart) continue;
        const amount = parseFloat(amtPart.replace(/[\$,]/g, ''));
        if (!isNaN(amount) && amount > 0) {
            rows.push({ transaction_date: date, amount, reference_id: ref, description: desc, currency: 'USD' });
        }
    }

    if (rows.length > 0) return rows;

    // Strategy B: generic fallback — scan each line for date + amount
    const dateRe = /(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
    for (const line of lines) {
        const lTrim = line.trim();
        if (lTrim.length < 8) continue;
        const dateMatch = lTrim.match(dateRe);
        if (!dateMatch) continue;
        const amtMatch = lTrim.match(/\$?([\d,]+\.\d{2})/);
        if (!amtMatch) continue;
        const amount = parseFloat(amtMatch[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
            const desc = lTrim
                .replace(dateMatch[0], '')
                .replace(/\$?[\d,]+\.\d{2}/g, '')
                .replace(/\b(CREDIT|DEBIT|SETTLED|PENDING)\b/g, '')
                .replace(/\s+/g, ' ').trim();
            rows.push({ transaction_date: dateMatch[1], amount, reference_id: null, description: desc || null, currency: 'USD' });
        }
    }

    return rows;
}


// ─── Routes ───────────────────────────────────────────────────────────────────


// GET /api/transactions
router.get('/', auth, async (req, res) => {
    try {
        const { source, status, batchId, runId } = req.query;
        const filter = { userId: req.userId };
        if (source && source !== 'all') filter.source = source;
        if (status && status !== 'all') filter.status = status;
        
        // Handle runId with matched/discrepancy status: Strictly show only what was matched in that specific run
        if (runId && (status === 'matched' || status === 'discrepancy')) {
            const Match = require('../models/Match');
            const matches = await Match.find({ runId, userId: req.userId });
            const matchedTxIds = matches.flatMap(m => [m.transactionAId, m.transactionBId]);
            filter._id = { $in: matchedTxIds };
        }
        // Handle runId (general or unmatched): filter by the batches associated with this run
        else if (runId) {
            const ReconciliationRun = require('../models/ReconciliationRun');
            const run = await ReconciliationRun.findOne({ _id: runId, userId: req.userId });
            if (run) {
                const batchIds = [run.batchAId, run.batchBId].filter(Boolean);
                if (batchIds.length) {
                    filter.uploadBatchId = { $in: batchIds };
                }
            }
        }
        // Direct batchId filter (array or CSV string)
        else if (batchId) {
            if (Array.isArray(batchId)) {
                filter.uploadBatchId = { $in: batchId };
            } else if (batchId.includes(',')) {
                filter.uploadBatchId = { $in: batchId.split(',') };
            } else {
                filter.uploadBatchId = batchId;
            }
        }

        const transactions = await Transaction.find(filter).sort({ transactionDate: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/transactions/stats
router.get('/stats', auth, async (req, res) => {
    try {
        const all = await Transaction.find({ userId: req.userId }).select('status');
        res.json({
            total: all.length,
            matched: all.filter((t) => t.status === 'matched').length,
            unmatched: all.filter((t) => t.status === 'unmatched').length,
            discrepancy: all.filter((t) => t.status === 'discrepancy').length,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/transactions/parse-file  — parse CSV or PDF, return raw rows for column mapping
router.post('/parse-file', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { mimetype, originalname, buffer } = req.file;
        const isPDF = mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf');

        if (isPDF) {
            const { text } = await extractPDFText(buffer);
            const rows = parsePDFText(text);
            if (rows.length === 0) {
                return res.status(422).json({ error: 'Could not extract transaction rows from this PDF. Make sure it is a text-based PDF (not a scanned image).' });
            }
            return res.json({ type: 'pdf', rows });
        } else {
            // CSV
            const { headers, data } = parseCSVBuffer(buffer);
            return res.json({ type: 'csv', headers, data });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/transactions/upload  — final import given mapped transaction objects
router.post('/upload', auth, async (req, res) => {
    try {
        const { fileName, source, transactions, columnMapping } = req.body;

        const batch = await UploadBatch.create({
            userId: req.userId,
            fileName,
            source,
            rowCount: transactions.length,
            status: 'processing',
            columnMapping: columnMapping || {},
        });

        const docs = transactions.map((t) => ({
            userId: req.userId,
            source,
            amount: t.amount,
            transactionDate: new Date(t.transaction_date),
            referenceId: t.reference_id || null,
            description: t.description || null,
            currency: t.currency || 'USD',
            uploadBatchId: batch._id,
        }));

        await Transaction.insertMany(docs);
        await UploadBatch.findByIdAndUpdate(batch._id, { status: 'completed' });

        await AuditLog.create({
            userId: req.userId,
            action: 'upload',
            entityType: 'upload_batch',
            entityId: batch._id,
            details: { fileName, source, rowCount: transactions.length },
        });

        res.status(201).json({ batchId: batch._id, count: transactions.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/transactions/purge - Clear all transactions and reconciliation history for a fresh start
router.delete('/purge', auth, async (req, res) => {
    try {
        const userId = req.userId;
        
        // Delete related data in order
        await Promise.all([
            Transaction.deleteMany({ userId }),
            require('../models/Match').deleteMany({ userId }),
            require('../models/ReconciliationRun').deleteMany({ userId }),
            require('../models/UploadBatch').deleteMany({ userId }),
            AuditLog.create({
                userId,
                action: 'purge_all',
                details: { timestamp: new Date() }
            })
        ]);

        res.json({ message: 'All transactions and reconciliation history cleared successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
