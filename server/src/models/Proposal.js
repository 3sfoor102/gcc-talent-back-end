const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coverLetter: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    deliveryDays: {
      type: Number,
      required: true,
    },
    milestones: [
      {
        title: String,
        amount: Number,
        dueDate: Date,
      },
    ],
    attachments: [
      {
        url: { type: String, required: true },
        public_id: { type: String },
        name: { type: String },
        size: { type: Number },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'accepted', 'declined', 'withdrawn'],
      default: 'pending',
    },
    declineReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

proposalSchema.index({ job: 1, freelancer: 1 }, { unique: true });

const Proposal = mongoose.model('Proposal', proposalSchema);
module.exports = Proposal;