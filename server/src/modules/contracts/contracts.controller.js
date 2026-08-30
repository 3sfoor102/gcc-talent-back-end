const Job = require('../../models/Job')
const Proposal = require('../../models/Proposal')
const FreelancerProfile = require('../../models/FreelancerProfile')
const Contract = require('../../models/Contract')

const listContracts = async (req, res) => {
    try {

        const userId = req.user._id || req.user.id || req.user.userId;

        const queryValues = {
            status: req.query.status,
            page: req.query.page || 1,
            limit: req.query.limit || 12
        }

        const query = {
            $or: [{ client: userId }, { freelancer: userId }]
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
            success: true,
            data: contracts,
            meta: { page: pageNum, limit: limitNum, total }
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const showContract = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;

        const foundContract = await Contract.findById(req.params.contractId).populate('client').populate('freelancer').populate('source.job').populate('source.gig')

        if (!foundContract) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Contract not found' }
            })
        }

        if (
            foundContract.client.toString() !== userId.toString() &&
            foundContract.freelancer.toString() !== userId.toString()
        ) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You are not a participant in this contract.' }
            })
        }

        return res.status(200).json({
            success: true,
            data: foundContract
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const addMilestone = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        const foundContract = await Contract.findById(req.params.contractId)

        if (!foundContract) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Contract not found' }
            })
        }

        if (foundContract.client.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have permission to create a milestone for this contract.' }
            })
        }

        if (foundContract.status !== 'active') {
            return res.status(422).json({
                success: false,
                error: { code: 'INVALID_STATE', message: `Cannot add a milestone to a ${foundContract.status} contract` }
            })
        }

        const milestoneDetails = {
            title: req.body.title,
            description: req.body.description,
            amount: req.body.amount,
            dueDate: req.body.dueDate,
            status: 'pending'
        }

        foundContract.milestones.push(milestoneDetails)

        await foundContract.save()

        return res.status(201).json({
            success: true,
            data: foundContract
        })


    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const editMilestone = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        const foundContract = await Contract.findById(req.params.contractId)

        if (!foundContract) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Contract not found' }
            })
        }

        if (foundContract.client.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have permission to edit a milestone for this contract.' }
            })
        }

        const foundMilestone = foundContract.milestones.id(req.params.milestoneId)

        if (!foundMilestone) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Milestone not found' }
            })
        }

        if (foundMilestone.status !== 'pending') {
            return res.status(422).json({
                success: false,
                error: { code: 'ESCROW_LOCKED', message: 'You can only edit unfunded milestones. Once funded, the terms are locked in escrow.' }
            })
        }

        if (req.body.amount && Number(req.body.amount) !== foundMilestone.amount) {
            foundContract.totalAmount -= foundMilestone.amount
            foundContract.totalAmount += Number(req.body.amount)
            foundMilestone.amount = Number(req.body.amount)
        }

        if (req.body.title) foundMilestone.title = req.body.title
        if (req.body.description) foundMilestone.description = req.body.description
        if (req.body.dueDate) foundMilestone.dueDate = req.body.dueDate

        await foundContract.save()

        return res.status(200).json({
            success: true,
            data: foundContract
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

module.exports = {
    listContracts,
    showContract,
    addMilestone,
    editMilestone
}