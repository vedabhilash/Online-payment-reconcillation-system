const mongoose = require('mongoose');

const reconciliationRunSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sourceA: { type: String, required: true },
    sourceB: { type: String, required: true },
    dateTolerance: { type: Number, default: 3 },
    amountTolerance: { type: Number, default: 0 },
    totalCompared: { type: Number, default: 0 },
    matchedCount: { type: Number, default: 0 },
    unmatchedCount: { type: Number, default: 0 },
    discrepancyCount: { type: Number, default: 0 },
    status: { type: String, default: 'running', enum: ['running', 'completed', 'failed'] },
    completedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('ReconciliationRun', reconciliationRunSchema);
