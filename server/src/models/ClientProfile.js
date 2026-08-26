const mongoose = require('mongoose')

const clientProfileSchema = new mongoose.Schema(
{
  user: 
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  companyName: 
  {
    type: String
  },

  isCompany: 
  {
    type: Boolean
  },

  description: 
  {
    type: String
  },

  website: 
  {
    type: String
  },

  jobsPosted: 
  {
    type: Number,
    default: 0
  },

  totalSpent: 
  {
    type: Number,
    default: 0
  }

}, 

{
  timestamps: true 
})

const ClientProfile = mongoose.model('ClientProfile', clientProfileSchema)

module.exports = ClientProfile