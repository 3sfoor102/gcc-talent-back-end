const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true, // Speeds up queries when a client loads proposals for their job
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Speeds up queries when a freelancer looks at their active bids
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
    // Freelancers can optionally suggest how to break down the payment
    milestones: [
      {
        title: String,
        amount: Number,
        dueDate: Date,
      },
    ],
    // Similar to the Message and Job models, files are kept off-server[cite: 2]
    attachments: [
      {
        url: String,
        name: String,
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
    timestamps: true, // Automatically adds createdAt and updatedAt[cite: 2]
  }
);

// Unique compound index: A freelancer can only submit ONE proposal per job[cite: 2]
proposalSchema.index({ job: 1, freelancer: 1 }, { unique: true });

const Proposal = mongoose.model('Proposal', proposalSchema);
module.exports = Proposal