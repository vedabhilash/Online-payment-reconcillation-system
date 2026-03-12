const mongoose = require('mongoose');

const invoiceLineItemSchema = new mongoose.Schema({
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }, // e.g., mapping to a Revenue account
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    amount: { type: Number, required: true } // quantity * unitPrice
}, { timestamps: true });

module.exports = mongoose.model('InvoiceLineItem', invoiceLineItemSchema);
