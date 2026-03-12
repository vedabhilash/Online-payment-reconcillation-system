const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    referenceNumber: { type: String }, // e.g., Invoice number or external receipt
    isSystemGenerated: { type: Boolean, default: false }, // if created via Invoice API
}, { timestamps: true });

// Ensure lines balance (Virtual Field/Pre-save hook usually goes here or in business logic)

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
