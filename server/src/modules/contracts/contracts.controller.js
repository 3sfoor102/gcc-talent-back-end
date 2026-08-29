const Job = require('../../models/Job')
const Proposal = require('../../models/Proposal')
const FreelancerProfile = require('../../models/FreelancerProfile')
const Contract = require('../../models/Contract')

const listContracts = async (req, res) => {
    try {

        const queryValues = {
            status: req.body.status,
            page: req.body.page || 1,
            limit: req.body.limit || 12
        }

        const query = {
            $or: [{ client: req.user._id }, { freelancer: req.user._id }]
        }

        if (queryValues.status) {
            query.status = queryValues.status;
        }

        const pageNum = parseInt(queryValues.page, 10)
        const limitNum = parseInt(queryValues.limit, 10)
        const skip = (pageNum - 1) * limitNum

        const [contracts, total] = await Promise.all([
            Contract.find(query)
                .populate('client').populate('freelancer')
                .sort('-createdAt')
                .skip(skip)
                .limit(limitNum),
            Contract.countDocuments(query)
        ])

        return res.status(200).json({
            data: contracts,
            meta: { page: pageNum, limit: limitNum, total }
        })

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const showContract = async (req, res) => {
    try {

        const foundContract = await Contract.findById(req.params.contractId).populate('client').populate('freelancer').populate('source.job').populate('source.gig')

        if (!foundContract) {
            return res.status(404).json({ err: 'Contract not found' })
        }

        if (
            foundContract.client.toString() !== req.user._id.toString() &&
            foundContract.freelancer.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ err: 'You are not a participant in this contract.' })
        }

        return res.status(200).json(contract)

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const addMilestone = async (req, res) => {
    try {
        const foundContract = await Contract.findById(req.params.contractId)

        if (!foundContract) {
            return res.status(404).json({ err: 'Contract not found' })
        }

        if (foundContract.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ err: 'You do not have permission to create a milestone for this contract.' })
        }

        if (foundContract.status !== 'active') {
            return res.status(400).json({ err: `Cannot add a milestone to a ${foundContract.status} contract` })
        }

        const milestoneDetails = {
            title: req.body.title,
            description: req.body.description,
            amount: req.body.amount,
            dueDate: req.body.dueDate,
            status: 'pending'
        }

        foundContract.milestones.push(milestoneDetails)

        foundContract.save()
        
        return res.status(201).json(foundContract)


    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const editMilestone = async (req, res) => {
    try {

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

module.exports = {
    listContracts,
    showContract,
    addMilestone,
    editMilestone
}