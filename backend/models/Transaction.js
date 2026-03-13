const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, required: true, enum: ['bank_statement', 'invoice', 'payment_gateway', 'order'] },
    referenceId: { type: String, default: null },
    description: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    transactionDate: { type: Date, required: true },
    status: { 
        type: String, 
        default: 'unmatched', 
        enum: ['unmatched', 'matched', 'discrepancy', 'timing_difference', 'adjusted', 'exception'] 
    },
    classification: {
        type: String,
        default: 'none',
        enum: ['none', 'missing_in_bank', 'missing_in_gateway', 'amount_mismatch', 'status_mismatch', 'duplicate']
    },
    uploadBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadBatch', default: null },
    adjustmentNotes: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
