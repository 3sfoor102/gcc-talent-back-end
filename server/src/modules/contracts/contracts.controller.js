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

module.exports = {
    listContracts,
}