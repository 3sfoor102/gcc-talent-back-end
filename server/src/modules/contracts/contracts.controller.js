const Job = require('../../models/Job')
const Proposal = require('../../models/Proposal')
const FreelancerProfile = require('../../models/FreelancerProfile')
const Contract = require('../../models/Contract')
const Review = require('../../models/Review')

const createReview = async (req, res) => {
    try {

        const foundContract = Contract.findById(req.params.contractId)

        if (!foundContract) {
            return res.status(404).json({ err: 'Contract not found' });
        }

        if (foundContract.status !== 'completed' && foundContract.status !== 'cancelled') {
            return res.status(400).json({ err: `Contract is still ${foundContract.status}` });
        }

        let thisReviewer = req.user._id
        let thisReviewee = ''

        if (req.user._id.toString() === foundContract.client.toString()) {
            thisReviewee = foundContract.freelancer
        } else if (req.user._id.toString() === foundContract.freelancer.toString()) {
            thisReviewee = foundContract.client
        } else {
            return res.status(403).json({ err: `You do not have the permission to leave a review on this contract` });
        }

        const foundReview = await Review.findOne({ reviewer: thisReviewer, contract: foundContract })

        if (foundReview) {
            return res.status(400).json({ err: 'You have an existing review on this contract' });
        }

        const newReview = await Review.create({
            contract: foundContract,
            reviewer: thisReviewer,
            reviewee: thisReviewee,
            rating: req.body.rating,
            comment: req.body.comment,
            scores: req.body.scores
        })

        const stats = await Review.aggregate([
            { $match: { reviewee: thisReviewee } },
            {
                $group: {
                    _id: '$reviewee',
                    ratingAvg: { $avg: '$rating' },
                    ratingCount: { $sum: 1 }
                }
            }
        ])

        if (stats.length > 0) {
            await User.findByIdAndUpdate(thisReviewee, {
                ratingAvg: Math.round(stats[0].ratingAvg * 10) / 10,
                ratingCount: stats[0].ratingCount
            })
        }

        req.status(201).json(newReview)

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const listUserReviews = async (req, res) => {
    try {

        const page = req.body.page || 1
        const limit = req.body.limit || 12

        const pageNum = parseInt(page, 10)
        const limitNum = parseInt(limit, 10)
        const skip = (pageNum - 1) * limitNum

        const query = { reviewee: req.params.userId }

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate('reviewer')
                .populate('contract')
                .sort('-createdAt') 
                .skip(skip)
                .limit(limitNum),
            Review.countDocuments(query)
        ])

        return res.status(200).json({
            data: reviews,
            meta: {
                page: pageNum,
                limit: limitNum,
                total
            }
        })

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

module.exports = {
    createReview,
    listUserReviews
}