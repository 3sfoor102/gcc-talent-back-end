const mongoose = require("mongoose");

function arrayLimit(val) {
  return Array.isArray(val) && val.length === 2;
}

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      validate: [arrayLimit, "A conversation must have exactly 2 participants"],
      required: true,
    },
    context: {
      job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
      contract: { type: mongoose.Schema.Types.ObjectId, ref: "Contract" },
      gig: { type: mongoose.Schema.Types.ObjectId, ref: "Gig" },
    },
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: Date,
    },
    unread: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;