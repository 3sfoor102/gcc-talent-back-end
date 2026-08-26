const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // Enforces unique skill names
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true, // Speeds up queries when loading skills for a specific category
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt[cite: 2]
  }
);

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill