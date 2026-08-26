const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  amount: { type: Number, required: true },
  dueDate: { type: Date },
  status: { 
    type: String, 
    enum: [
      'pending', 'funded', 'in_progress', 'delivered', 
      'revision_requested', 'approved', 'disputed', 
      'refunded', 'split', 'cancelled'
    ],
    default: 'pending'
  },
  escrowAmount: { type: Number, default: 0 },
  deliveries: [{
    message: String,
    attachments: [{ url: String, name: String }],
    submittedAt: Date,
    response: { type: String, enum: ['approved', 'revision'] },
    responseNote: String,
    respondedAt: Date
  }],
  fundedAt: Date,
  deliveredAt: Date,
  approvedAt: Date
});

const contractSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source: { 
    type: { type: String, enum: ['job', 'gig'] },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' },
    gig: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig' },
    tier: String 
  },
  title: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  milestones: [milestoneSchema],
  activity: [{ 
    type: { type: String }, 
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    message: String, 
    at: Date 
  }],
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Contract', contractSchema);