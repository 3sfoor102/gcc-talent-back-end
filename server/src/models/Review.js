const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
      index: true, // Used when querying reviews associated with a contract
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Critical for loading reviews on public profile pages
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5, // Enforces 1-5 star ratings
    },
    comment: {
      type: String,
      trim: true,
    },
    scores: {
      communication: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      timeliness: { type: Number, min: 1, max: 5 },
    },
    // Allows the recipient to reply once (F-REV-04)
    reply: {
      text: { type: String, trim: true },
      at: { type: Date },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  },
);

// Unique compound index: One review per party per contract
reviewSchema.index({ contract: 1, reviewer: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
