const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true, // Crucial for querying messages by conversation ID
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: function () {
        // A message must have either text or an attachment
        // FIXED: Added safe check to prevent TypeError on undefined attachments array
        return !this.attachments || this.attachments.length === 0;
      },
    },

    attachments: [
      {
        url: String,
        name: String,
      },
    ],

    // Tracking read receipts. When a 'message:read' socket event occurs,
    // we push the user's ID into this array.
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
