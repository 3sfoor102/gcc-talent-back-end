const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, 
  type: { 
    type: String, 
    enum: [
      'deposit', 'escrow_fund', 'escrow_release', 
      'escrow_refund', 'platform_fee', 'withdrawal'
    ],
    required: true
  },
  amount: { type: Number, required: true, min: 0 }, 
  direction: { type: String, enum: ['credit', 'debit'], required: true },
  balanceAfter: { type: Number },
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  milestoneId: { type: mongoose.Schema.Types.ObjectId },
  reference: { type: String, required: true, unique: true }, 
  status: { type: String, enum: ['completed', 'failed'], required: true },
  meta: { type: mongoose.Schema.Types.Mixed } 
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);