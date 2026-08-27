const Job = require('../../models/Job')
const Proposal = require('../../models/Proposal')
const FreelancerProfile = require('../../models/FreelancerProfile')

const createProposal = async (req, res) => {
    try {
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob || foundJob.status !== 'open') {
            // return error
        }

        const foundFreelancer = await FreelancerProfile.findOne({ user: req.user._id })

        if (!foundFreelancer) {
            // return error
        }

        const appliedBefore = await Proposal.findOne({ job: req.params.jobId, freelancer: req.user._id })

        if (appliedBefore) {
            // return error, already applied
        }

        let proposalDetails = {
            job: foundJob,
            freelancer: req.user._id,
            coverLetter: req.body.coverLetter,
            amount: req.body.amount,
            deliveryDays: req.body.deliveryDays,
            milestones: [],
            attachments: [],
        }

        // proposalDetails.milestones  need to push the milestones one by one into an array
        // proposalDetails.attachments  need to push the milestones one by one into an array

        const newProposal = await Proposal.create(proposalDetails)
        foundJob.proposalsCount += 1
        foundJob.save()

        req.status(201).json(newProposal)

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}



module.exports = {
    createProposal,
}