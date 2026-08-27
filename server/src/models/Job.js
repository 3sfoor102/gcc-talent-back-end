const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        index: true
    },
    
    skills: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        index: true
    }],
    
    budgetType: {
        type: String,
        enum: ['fixed', 'hourly'],
        required: true
    },
    budgetMin: { type: Number },
    budgetMax: { type: Number },
    experienceLevel: {
        type: String,
        enum: ['entry', 'intermediate', 'expert']
    },
    duration: { type: String },
    deadline: { type: Date },
    attachments: [
        // chnage to use cloudinary attachments structure
        {
            url: String,
            name: String,
            size: Number
        }
    ],
    status: {
        type: String,
        enum: ['draft', 'open', 'in_progress', 'completed', 'closed'],
        default: 'draft',
        index: true
    },
    proposalsCount: {
        type: Number,
        default: 0
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isHidden: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Text index for search functionality
jobSchema.index({ title: 'text', description: 'text' });

const Job = mongoose.model('Job', jobSchema);
module.exports = Job