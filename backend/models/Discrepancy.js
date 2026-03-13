const mongoose = require('mongoose');

const discrepancySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    runId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReconciliationRun', required: true },
    transactionAId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true }, // Bank
    transactionBId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true }, // Gateway
    type: { type: String, enum: ['amount_mismatch', 'status_mismatch', 'timing_difference'], required: true },
    difference: { type: Number, default: 0 },
    status: { type: String, default: 'unresolved', enum: ['unresolved', 'resolved', 'investigating'] },
    notes: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Discrepancy', discrepancySchema);
