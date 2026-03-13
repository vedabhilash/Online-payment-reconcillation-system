const mongoose = require('mongoose');

const exceptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  runId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReconciliationRun'
  },
  bankTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  gatewayTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  type: {
    type: String,
    enum: [
      "missing_transaction",
      "amount_mismatch",
      "timing_difference"
    ]
  },
  difference: Number,
  status: {
    type: String,
    enum: [
      "open",
      "investigating",
      "resolved",
      "ignored"
    ],
    default: "open"
  },
  notes: String
}, { timestamps: true });

module.exports = mongoose.model("Exception", exceptionSchema);
