const Job = require('../../models/Job');
const Proposal = require('../../models/Proposal');
const FreelancerProfile = require('../../models/FreelancerProfile');
const Contract = require('../../models/Contract');
const Review = require('../../models/Review');
const User = require('../../models/User');
const contractsService = require('./contracts.service.js');

const createReview = async (req, res, next) => {
    try {
        const foundContract = await Contract.findById(req.params.contractId);

        if (!foundContract) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Contract not found' }
            });
        }

        if (foundContract.status !== 'completed' && foundContract.status !== 'cancelled') {
            return res.status(422).json({
                success: false,
                error: { code: 'INVALID_STATE', message: `Cannot review a contract that is ${foundContract.status}` }
            });
        }

        const thisReviewer = req.user._id || req.user.id;
        let thisReviewee = '';

        if (thisReviewer.toString() === foundContract.client.toString()) {
            thisReviewee = foundContract.freelancer;
        } else if (thisReviewer.toString() === foundContract.freelancer.toString()) {
            thisReviewee = foundContract.client;
        } else {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have permission to leave a review on this contract' }
            });
        }

        const foundReview = await Review.findOne({ reviewer: thisReviewer, contract: foundContract._id });
        if (foundReview) {
            return res.status(409).json({
                success: false,
                error: { code: 'CONFLICT', message: 'You have an existing review on this contract' }
            });
        }

        const newReview = await Review.create({
            contract: foundContract._id,
            reviewer: thisReviewer,
            reviewee: thisReviewee,
            rating: req.body.rating,
            comment: req.body.comment,
            scores: req.body.scores
        });

        const stats = await Review.aggregate([
            { $match: { reviewee: thisReviewee } },
            {
                $group: {
                    _id: '$reviewee',
                    ratingAvg: { $avg: '$rating' },
                    ratingCount: { $sum: 1 }
                }
            }
        ]);

        if (stats.length > 0) {
            await User.findByIdAndUpdate(thisReviewee, {
                ratingAvg: Math.round(stats[0].ratingAvg * 10) / 10,
                ratingCount: stats[0].ratingCount
            });
        }

        return res.status(201).json({
            success: true,
            data: newReview
        });

    } catch (err) {
        next(err);
    }
};

const listUserReviews = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 12;
        const skip = (page - 1) * limit;

        const query = { reviewee: req.params.userId };

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate('reviewer', 'name avatarUrl')
                .populate('contract', 'title')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit),
            Review.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            data: reviews,
            meta: {
                page,
                limit,
                total
            }
        });

    } catch (err) {
        next(err);
    }
};

const getContracts = async (req, res, next) => {
    try {
        const userId = req.user._id || req.user.id;
        const role = req.user.role;
        const { status } = req.query;

        const result = await contractsService.getUserContracts(userId, role, status);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const getContractById = async (req, res, next) => {
    try {
        const contractId = req.params.id;
        const userId = req.user._id || req.user.id;
        const role = req.user.role;

        const result = await contractsService.getContractWorkspace(contractId, userId, role);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const addMilestone = async (req, res, next) => {
    try {
        const contractId = req.params.id;
        const clientId = req.user._id || req.user.id;
        const milestoneData = req.body;

        const result = await contractsService.addMilestone(contractId, clientId, milestoneData);

        return res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const fundMilestone = async (req, res, next) => {
    try {
        const { id: contractId, mid: milestoneId } = req.params;
        const clientId = req.user._id || req.user.id;

        const result = await contractsService.fundMilestone(contractId, milestoneId, clientId);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const deliverMilestone = async (req, res, next) => {
    try {
        const { id: contractId, mid: milestoneId } = req.params;
        const freelancerId = req.user._id || req.user.id;
        const deliveryData = req.body;

        const result = await contractsService.deliverMilestone(contractId, milestoneId, freelancerId, deliveryData);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const approveMilestone = async (req, res, next) => {
    try {
        const { id: contractId, mid: milestoneId } = req.params;
        const clientId = req.user._id || req.user.id;

        const result = await contractsService.approveMilestone(contractId, milestoneId, clientId);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createReview,
    listUserReviews,
    getContracts,
    getContractById,
    addMilestone,
    fundMilestone,
    deliverMilestone,
    approveMilestone
};