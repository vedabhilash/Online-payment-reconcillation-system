const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    loginUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // the credentials of the customer mapping to this record
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    billingAddress: { type: String },
    taxId: { type: String },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
