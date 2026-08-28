const Job = require('../../models/Job')
const Proposal = require('../../models/Proposal')
const FreelancerProfile = require('../../models/FreelancerProfile')

// Freelancer related functions

const getMyProposals = async (req, res) => {
    try {
        const foundProposals = await Proposal.find({ freelancer: req.user._id }).populate('job').sort('-createdAt')

        req.status(200).json(foundProposals)

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const createProposal = async (req, res) => {
    try {
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob || foundJob.status !== 'open') {
            return res.status(404).json({ err: 'Job not found or is not open for proposals' })
        }

        if (foundJob.client.toString() === req.user._id.toString()) {
            return res.status(403).json({ err: 'You cannot apply to your own job.' })
        }

        const foundFreelancer = await FreelancerProfile.findOne({ user: req.user._id })

        if (!foundFreelancer) {
            return res.status(404).json({ err: 'Freelancer profile not found.' })
        }

        const appliedBefore = await Proposal.findOne({ job: req.params.jobId, freelancer: req.user._id })

        if (appliedBefore) {
            return res.status(409).json({ err: 'You have already submitted a proposal for this job.' })
        }

        let proposalDetails = {
            job: foundJob,
            freelancer: req.user._id,
            coverLetter: req.body.coverLetter,
            amount: req.body.amount,
            deliveryDays: req.body.deliveryDays,
            milestones: req.body.milestones || [],
            attachments: [], //would need to check about using cloudinary to upload the files
            status: 'pending'
        }

        const newProposal = await Proposal.create(proposalDetails)

        foundJob.proposalsCount += 1
        foundJob.save()

        req.status(201).json(newProposal)

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const updateProposal = async (req, res) => {
    try {
        const proposalToEdit = await Proposal.findById(req.params.proposalId)

        if (proposalToEdit.freelancer.toString() === req.user._id.toString()) {
            return res.status(403).json({ err: 'You dont have access to edit this proposal.' })
        }

        if (proposalToEdit.status !== 'pending') {
            return res.status(400).json({ err: 'This proposal is locked due to status change by client.' })
        }

        if (req.body.coverLetter) proposalToEdit.coverLetter = req.body.coverLetter
        if (req.body.amount) proposalToEdit.amount = req.body.amount
        if (req.body.deliveryDays) proposalToEdit.deliveryDays = req.body.deliveryDays
        if (req.body.milestones) proposalToEdit.milestones = req.body.milestones
        if (req.body.attachments) proposalToEdit.attachments = req.body.attachments

        const updatedProposal = await proposalToEdit.save()
        res.status(200).json(updatedProposal)

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const withdrawProposal = async (req, res) => {
    try {
        const proposalToWithdraw = await Proposal.findById(req.params.proposalId)

        if (proposalToWithdraw.freelancer.toString() === req.user._id.toString()) {
            return res.status(403).json({ err: 'You dont have access to edit this proposal.' })
        }

        if (proposalToWithdraw.status !== 'pending') {
            return res.status(400).json({ err: 'This proposal is locked due to status change by client.' })
        }

        proposalToWithdraw.status = 'withdrawn'

        const withdrawnProposal = await proposalToWithdraw.save()
        res.status(200).json(withdrawnProposal)

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

// Client related functions

const getJobProposals = async (req, res) => {
    try {

        const foundJob = await Job.findById(req.params.jobId)
        if (!foundJob) {
            return res.status(404).json({ err: 'Job not found' })
        }
        if (foundJob.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ err: 'You can only view proposals for your own jobs.' })
        }

        const foundProposals = await Proposal.find({ job: req.params.jobId }).populate('freelancer')

        req.status(200).json(foundProposals)

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}




module.exports = {
    createProposal,
    getJobProposals,
    getMyProposals,
    updateProposal,
    withdrawProposal
}