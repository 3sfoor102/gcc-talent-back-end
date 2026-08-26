const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema(
  {
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Speeds up loading a specific freelancer's gigs
    },
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: { type: String, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    tags: [String],
    // Image files must be stored off-server (e.g., Cloudinary), so we only save the URLs here
    images: [String],
    // Gigs support up to 3 pricing tiers (Fiverr-style)[cite: 2]
    tiers: [
      {
        name: {
          type: String,
          enum: ['basic', 'standard', 'premium'],
          required: true
        },
        price: { type: Number, required: true },
        deliveryDays: { type: Number, required: true },
        revisions: { type: Number, required: true },
        features: [String],
      },
    ],
    faqs: [
      {
        q: { type: String, required: true },
        a: { type: String, required: true },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'paused', 'draft'],
      default: 'draft', // Matches the specified state machine[cite: 2]
    },
    // Denormalized metrics for quick loading on search pages[cite: 2]
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt[cite: 2]
  }
);

const Gig = mongoose.model('Gig', gigSchema);

module.exports = Gig