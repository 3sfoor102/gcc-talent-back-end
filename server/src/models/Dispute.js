const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    milestoneId: { type: mongoose.Schema.Types.ObjectId, required: true },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    against: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: { type: String, required: true },
    evidence: [{ url: String, name: String }],
    status: {
      type: String,
      enum: ["open", "under_review", "resolved"],
      default: "open",
    },
    resolution: {
      outcome: { type: String, enum: ["release", "refund", "split"] },
      freelancerPct: Number,
      note: String,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Dispute", disputeSchema);
