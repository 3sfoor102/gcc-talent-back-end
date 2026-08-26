const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
{
  name: 
  { 
    type: String, 
    required: true 
  },

  email: 
  { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    index: true 
  },

  passwordHash: 
  { 
    type: String, 
    required: true, 
    select: false
  },

  role: 
  { 
    type: String, 
    enum: ['client', 'freelancer', 'admin'], 
    required: true 
  },

  avatarUrl: 
  { 
    type: String 
  },

  isEmailVerified: 
  { 
    type: Boolean, 
    default: false 
  },

  status: 
  { 
    type: String, 
    enum: ['active', 'suspended'], 
    default: 'active' 
  },

  country: 
  { 
    type: String 
  },

  city: 
  { 
    type: String 
  },

  ratingAvg: 
  { 
    type: Number, 
    default: 0 
  },

  ratingCount: 
  { 
    type: Number, 
    default: 0 
  },

  wallet: 
  {
    available: 
    { 
      type: Number, 
      default: 0 
    },

    pending: 
    { 
      type: Number, 
      default: 0 
    }
  },

  notificationPrefs: 
  {
    email: { 
      type: Boolean,
      default: true
    }
  },

  refreshTokenHash: 
  { 
    type: String, 
    select: false
  },

  lastLoginAt: 
  { 
    type: Date 
  }
}, 

{
  timestamps: true
})

const User = mongoose.model('User', userSchema) 

module.exports = User