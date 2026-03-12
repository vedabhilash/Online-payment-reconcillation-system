const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    runId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReconciliationRun', required: true },
    transactionAId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    transactionBId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    matchType: { type: String, default: 'auto', enum: ['auto', 'manual'] },
    confidence: { type: Number, default: null },
    status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
    notes: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
