const mongoose = require('mongoose')
const Job = require('../../models/Job')
const Proposal = require('../../models/Proposal')
const FreelancerProfile = require('../../models/FreelancerProfile')
const Contract = require('../../models/Contract')
const cloudinary = require('../../config/cloudinary')

const deleteFromCloudinary = async (attachments) => {
    if (!attachments || attachments.length === 0) return

    for (const file of attachments) {
        if (file.public_id) {
            try {
                const res = await cloudinary.uploader.destroy(file.public_id)
                if (res.result === 'not found') {
                    await cloudinary.uploader.destroy(file.public_id, { resource_type: 'raw' })
                }
            } catch (err) {
                console.log("Could not delete from Cloudinary:", err.message)
            }
        }
    }
}

// Freelancer related functions

const getMyProposals = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId
        const page = parseInt(req.query.page, 10) || 1
        const limit = parseInt(req.query.limit, 10) || 12
        const skip = (page - 1) * limit

        const query = { freelancer: userId }

        const [foundProposals, total] = await Promise.all([
            Proposal.find(query)
                .populate('job')
                .skip(skip)
                .limit(limit)
                .sort('-createdAt'),
            Proposal.countDocuments(query)
        ])

        return res.status(200).json({
            success: true,
            data: foundProposals,
            meta: { page, limit, total }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const createProposal = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob || foundJob.status !== 'open') {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Job not found or is not open for proposals' }
            })
        }

        if (foundJob.client.toString() === userId.toString()) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You cannot apply to your own job.' }
            })
        }

        const foundFreelancer = await FreelancerProfile.findOne({ user: userId })
        if (!foundFreelancer) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Freelancer profile not found. Please create one before applying.' }
            })
        }

        const appliedBefore = await Proposal.findOne({ job: req.params.jobId, freelancer: userId })
        if (appliedBefore) {
            return res.status(409).json({
                success: false,
                error: { code: 'CONFLICT', message: 'You have already submitted a proposal for this job.' }
            })
        }

        const proposalDetails = {
            job: foundJob._id,
            freelancer: userId,
            coverLetter: req.body.coverLetter,
            amount: Number(req.body.amount),
            deliveryDays: Number(req.body.deliveryDays),
            milestones: req.body.milestones || [],
            attachments: req.body.attachments || [],
            status: 'pending'
        }

        const newProposal = await Proposal.create(proposalDetails)

        foundJob.proposalsCount = (foundJob.proposalsCount || 0) + 1
        await foundJob.save()

        return res.status(201).json({
            success: true,
            data: newProposal
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const updateProposal = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId
        const proposalToEdit = await Proposal.findById(req.params.proposalId)

        if (!proposalToEdit) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Proposal not found' }
            })
        }

        if (proposalToEdit.freelancer.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have access to edit this proposal.' }
            })
        }

        if (proposalToEdit.status !== 'pending') {
            return res.status(422).json({
                success: false,
                error: { code: 'INVALID_STATE', message: 'This proposal cannot be modified because its status is no longer pending.' }
            })
        }

        if (req.body.attachments) {
            const filesToDelete = proposalToEdit.attachments.filter((oldFile) => {
                const stillExists = req.body.attachments.some(
                    (newFile) => newFile.public_id === oldFile.public_id
                )
                return !stillExists
            })

            await deleteFromCloudinary(filesToDelete)
            proposalToEdit.attachments = req.body.attachments
        }

        if (req.body.coverLetter) proposalToEdit.coverLetter = req.body.coverLetter
        if (req.body.amount) proposalToEdit.amount = Number(req.body.amount)
        if (req.body.deliveryDays) proposalToEdit.deliveryDays = Number(req.body.deliveryDays)
        if (req.body.milestones) proposalToEdit.milestones = req.body.milestones

        const updatedProposal = await proposalToEdit.save()

        return res.status(200).json({
            success: true,
            data: updatedProposal
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const withdrawProposal = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId
        const proposalToWithdraw = await Proposal.findById(req.params.proposalId)

        if (!proposalToWithdraw) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Proposal not found' }
            })
        }

        if (proposalToWithdraw.freelancer.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have access to withdraw this proposal.' }
            })
        }

        if (proposalToWithdraw.status !== 'pending') {
            return res.status(422).json({
                success: false,
                error: { code: 'INVALID_STATE', message: 'Only pending proposals can be withdrawn.' }
            })
        }

        await deleteFromCloudinary(proposalToWithdraw.attachments)
        proposalToWithdraw.attachments = []

        proposalToWithdraw.status = 'withdrawn'
        const withdrawnProposal = await proposalToWithdraw.save()

        return res.status(200).json({
            success: true,
            data: withdrawnProposal
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

// Client related functions

const getJobProposals = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Job not found' }
            })
        }

        if (foundJob.client.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You can only view proposals for your own jobs.' }
            })
        }

        const page = parseInt(req.query.page, 10) || 1
        const limit = parseInt(req.query.limit, 10) || 12
        const skip = (page - 1) * limit

        const query = { job: req.params.jobId }

        const [foundProposals, total] = await Promise.all([
            Proposal.find(query)
                .populate('freelancer', 'name email avatarUrl ratingAvg')
                .skip(skip)
                .limit(limit)
                .sort('-createdAt'),
            Proposal.countDocuments(query)
        ])

        return res.status(200).json({
            success: true,
            data: foundProposals,
            meta: { page, limit, total }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const acceptProposal = async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const userId = req.user._id || req.user.id || req.user.userId
        const proposalToAccept = await Proposal.findById(req.params.proposalId).populate('job')

        if (!proposalToAccept) {
            await session.abortTransaction()
            session.endSession()
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Proposal not found' }
            })
        }

        if (proposalToAccept.job.client.toString() !== userId.toString()) {
            await session.abortTransaction()
            session.endSession()
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You are not allowed to accept this proposal you are not the job owner.' }
            })
        }

        if (!['pending', 'shortlisted'].includes(proposalToAccept.status)) {
            await session.abortTransaction()
            session.endSession()
            return res.status(422).json({
                success: false,
                error: { code: 'INVALID_STATE', message: 'Only pending or shortlisted proposals can be accepted.' }
            })
        }

        await Proposal.updateMany(
            {
                job: proposalToAccept.job._id,
                status: { $in: ['pending', 'shortlisted'] },
                _id: { $ne: proposalToAccept._id }
            },
            { status: 'declined', declineReason: 'Another proposal was accepted.' },
            { session }
        )

        proposalToAccept.status = 'accepted'
        await proposalToAccept.save({ session })

        const job = proposalToAccept.job
        job.status = 'in_progress'
        await job.save({ session })

        const defaultDueDate = new Date(Date.now() + (proposalToAccept.deliveryDays || 7) * 24 * 60 * 60 * 1000)
        const milestones = proposalToAccept.milestones && proposalToAccept.milestones.length > 0 ? proposalToAccept.milestones
            : [{
                title: 'Final Delivery',
                amount: proposalToAccept.amount,
                dueDate: defaultDueDate,
                status: 'pending'
            }]

        const [newContract] = await Contract.create([
            {
                client: job.client,
                freelancer: proposalToAccept.freelancer,
                source: {
                    type: 'job',
                    job: job._id,
                    proposal: proposalToAccept._id
                },
                title: job.title,
                totalAmount: proposalToAccept.amount,
                currency: 'USD',
                status: 'active',
                milestones
            }
        ], { session })

        await session.commitTransaction()
        session.endSession()

        return res.status(201).json({
            success: true,
            data: newContract
        })
    } catch (err) {
        await session.abortTransaction()
        session.endSession()
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const shortlistProposal = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId
        const proposal = await Proposal.findById(req.params.proposalId).populate('job')

        if (!proposal) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Proposal not found' }
            })
        }

        if (proposal.job.client.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only the job owner can shortlist proposals.' }
            })
        }

        if (proposal.status !== 'pending') {
            return res.status(422).json({
                success: false,
                error: { code: 'INVALID_STATE', message: 'Only pending proposals can be shortlisted.' }
            })
        }

        proposal.status = 'shortlisted'
        await proposal.save()

        return res.status(200).json({
            success: true,
            data: proposal
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const declineProposal = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId
        const proposal = await Proposal.findById(req.params.proposalId).populate('job')

        if (!proposal) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Proposal not found' }
            })
        }

        if (proposal.job.client.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only the job owner can decline proposals.' }
            })
        }

        if (!['pending', 'shortlisted'].includes(proposal.status)) {
            return res.status(422).json({
                success: false,
                error: { code: 'INVALID_STATE', message: 'Only pending or shortlisted proposals can be declined.' }
            })
        }

        proposal.status = 'declined'
        if (req.body.declineReason) {
            proposal.declineReason = req.body.declineReason
        }
        await proposal.save()

        return res.status(200).json({
            success: true,
            data: proposal
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

module.exports = {
    createProposal,
    getJobProposals,
    getMyProposals,
    updateProposal,
    withdrawProposal,
    acceptProposal,
    shortlistProposal,
    declineProposal
}