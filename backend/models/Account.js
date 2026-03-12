const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accountName: { type: String, required: true },
    accountType: {
        type: String,
        enum: ['Asset', 'Liability', 'Equity', 'Expense'],
        required: true
    },
    accountNumber: { type: String },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
