const mongoose = require('mongoose');

const journalLineSchema = new mongoose.Schema({
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Debit', 'Credit'], required: true },
    amount: { type: Number, required: true },
    description: { type: String } // Optional line item description
}, { timestamps: true });

module.exports = mongoose.model('JournalLine', journalLineSchema);
