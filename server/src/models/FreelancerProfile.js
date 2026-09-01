const mongoose = require('mongoose')

const freelancerProfileSchema = new mongoose.Schema(
{
  user: 
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  headline: 
  {
    type: String
  },

  bio: 
  {
    type: String
  },

  skills: 
  [{
    type: String
  }],

  hourlyRate: 
  {
    type: Number
  },
  
  currency: 
  {
    type: String,
    default: 'BHD'
  },

  languages: 
  [{
    name: { type: String },
    level: { type: String }
  }],

  availability: 
  {
    type: String,
    enum: ['full_time', 'part_time', 'unavailable']
  },

  portfolio: 
  [{
    title: { type: String },
    description: { type: String },
    imageUrl: { type: String },
    link: { type: String }
  }],

  completedContracts: 
  {
    type: Number,
    default: 0
  },

  totalEarned: 
  {
    type: Number,
    default: 0
  }
}, 

{
  timestamps: true
})

const FreelancerProfile = mongoose.model('FreelancerProfile', freelancerProfileSchema)

module.exports = FreelancerProfile