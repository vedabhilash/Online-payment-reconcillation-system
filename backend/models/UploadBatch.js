const mongoose = require('mongoose');

const uploadBatchSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    source: { type: String, required: true, enum: ['bank_statement', 'invoice', 'payment_gateway', 'order'] },
    rowCount: { type: Number, default: 0 },
    status: { type: String, default: 'processing', enum: ['processing', 'completed', 'failed'] },
    columnMapping: { type: Object, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('UploadBatch', uploadBatchSchema);
