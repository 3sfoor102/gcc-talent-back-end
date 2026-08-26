const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        // We limit this to exactly 2 users for private messaging
        validate: [
          arrayLimit,
          "A conversation must have exactly 2 participants",
        ],
      },
    ],
    // Context links the chat to the specific job, gig, or contract
    context: {
      job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
      contract: { type: mongoose.Schema.Types.ObjectId, ref: "Contract" },
      gig: { type: mongoose.Schema.Types.ObjectId, ref: "Gig" },
    },
    // Denormalized field: storing the last message here saves us from having to
    // query the Messages collection just to render the inbox list
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: Date,
    },
    // Map allows dynamic keys (the User IDs) to track unread counts.
    // When a socket event 'message:new' fires, we increment the receiver's unread count here.
    unread: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  },
);

// Helper function to ensure only 2 participants
function arrayLimit(val) {
  return val.length === 2;
}

// Indexing participants helps speed up queries when loading a user's inbox
conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
