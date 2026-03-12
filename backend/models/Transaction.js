const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, required: true, enum: ['bank_statement', 'invoice', 'payment_gateway', 'order'] },
    referenceId: { type: String, default: null },
    description: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    transactionDate: { type: Date, required: true },
    status: { type: String, default: 'unmatched', enum: ['unmatched', 'matched', 'discrepancy'] },
    uploadBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadBatch', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
