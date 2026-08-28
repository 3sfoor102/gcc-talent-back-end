const Job = require('../../models/Job')
const Proposal = require('../../models/Proposal')
const FreelancerProfile = require('../../models/FreelancerProfile')
const Contract = require('../../models/Contract')

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

        if (!proposalToEdit) {
            return res.status(404).json({ err: 'Proposal not found' });
        }

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

        if (!proposalToWithdraw) {
            return res.status(404).json({ err: 'Proposal not found' });
        }

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

const acceptProposal = async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const proposalToAccept = await Proposal.findById(req.params.proposalId).populate('job')

        if (!proposalToAccept) {
            await session.abortTransaction()
            session.endSession()
            return res.status(404).json({ err: 'Proposal not found' });
        }

        if (!proposalToAccept.job.client.toString() === req.user._id.toString()) {
            await session.abortTransaction()
            session.endSession()
            return res.status(403).json({ err: 'You are not allowed to accept this proposal, you are not the owner.' })
        }

        if (proposalToAccept.status !== 'pending' || proposalToAccept.status !== 'shortlisted') {
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({ err: 'This proposal is either already accepted or withdrawn.' })
        }

        // decline other proposals that are pending
        // const toDeclineProposals = await Proposal.find({ job: proposalToAccept.job._id })
        // toDeclineProposals.map(async (currProposal) => {
        //     if (currProposal._id !== proposalToAccept._id){
        //     currProposal.status = 'declined'
        //     await currProposal.save()}
        // })
        await Proposal.updateMany(
            {
                job: job._id,
                status: { $in: ['pending', 'shortlisted'] },
                _id: { $ne: proposal._id }
            },
            { status: 'declined' },
            { session }
        );

        // update job to in progress
        // const updateJob = await Job.findByIdAndUpdate(proposalToAccept.job._id, { status: 'in_progress' })
        proposalToAccept.job.status = 'in_progress'
        proposalToAccept.job.status.save({ session })

        // change status of the proposal to accepted
        proposalToAccept.status = 'accepted';
        await proposalToAccept.save({ session })



        // Create the Contract (F-CON-01) here 
        const newContract = await Contract.create([{
            client: proposalToAccept.job.client,
            freelancer: proposalToAccept.freelancer,
            source: {
                type: 'job',
                job: proposalToAccept.job._id,
                proposal: proposalToAccept._id
            },
            title: job.title,
            totalAmount: proposalToAccept.amount,
            currency: 'USD',
            status: 'active',
            milestones: proposal.milestones.length > 0 ? proposal.milestones : [{
                title: 'Final Delivery',
                amount: proposal.amount,
                dueDate: new Date(Date.now() + proposal.deliveryDays * 24 * 60 * 60 * 1000), // Add delivery days to current date
                status: 'pending'
            }]
        }], { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(newContract[0]);

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ err: err.message });
    }
}

const shortlistProposal = async (req, res) => {
    try {
        const proposalToShortlist = await Proposal.findById(req.params.proposalId).populate('job')

        if (!proposalToShortlist) {
            return res.status(404).json({ err: 'Proposal not found' });
        }

        if (!proposalToShortlist.job.client.toString() === req.user._id.toString()) {
            return res.status(403).json({ err: 'You are not allowed to accept this proposal, you are not the owner.' })
        }

        if (proposalToShortlist.status !== 'pending') {
            return res.status(400).json({ err: 'This proposal is either already accepted or withdrawn.' })
        }

        proposalToShortlist.status = 'shortlisted'
        proposalToShortlist.save()

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const declineProposal = async (req, res) => {
    try {
        const proposalToDecline = await Proposal.findById(req.params.proposalId).populate('job')

        if (!proposalToDecline) {
            return res.status(404).json({ err: 'Proposal not found' });
        }

        if (!proposalToDecline.job.client.toString() === req.user._id.toString()) {
            return res.status(403).json({ err: 'You are not allowed to accept this proposal, you are not the owner.' })
        }

        if (proposalToDecline.status !== 'pending' || proposalToDecline.status !== 'shortlisted') {
            return res.status(400).json({ err: 'This proposal is either already accepted or withdrawn.' })
        }

        proposalToDecline.status = 'declined'
        if (req.body.declineReason) {
            proposalToDecline.declineReason = req.body.declineReason
        }
        proposalToDecline.save()

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

module.exports = {
    createProposal,
    getJobProposals,
    getMyProposals,
    updateProposal,
    withdrawProposal,
    acceptProposal,
    shortlistProposal
}