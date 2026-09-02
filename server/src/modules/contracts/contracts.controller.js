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

    const thisReviewer = req.user._id || req.user.id || req.user.userId;
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
      meta: { page, limit, total }
    });
  } catch (err) {
    next(err);
  }
};

const getContracts = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id || req.user.userId;
    const role = req.user.role;
    const { status } = req.query;

    if (contractsService && typeof contractsService.getUserContracts === 'function') {
      const result = await contractsService.getUserContracts(userId, role, status);
      return res.status(200).json({
        success: true,
        data: result
      });
    }

    const queryValues = {
      status: req.query.status,
      page: req.query.page || 1,
      limit: req.query.limit || 12
    };

    const query = {
      $or: [{ client: userId }, { freelancer: userId }]
    };

    if (queryValues.status) {
      query.status = queryValues.status;
    }

    const pageNum = parseInt(queryValues.page, 10);
    const limitNum = parseInt(queryValues.limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [contracts, total] = await Promise.all([
      Contract.find(query)
        .populate('client')
        .populate('freelancer')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum),
      Contract.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: contracts,
      meta: { page: pageNum, limit: limitNum, total }
    });
  } catch (error) {
    next(error);
  }
};

const getContractById = async (req, res, next) => {
  try {
    const contractId = req.params.id || req.params.contractId;
    const userId = req.user._id || req.user.id || req.user.userId;
    const role = req.user.role;

    if (contractsService && typeof contractsService.getContractWorkspace === 'function') {
      const result = await contractsService.getContractWorkspace(contractId, userId, role);
      return res.status(200).json({
        success: true,
        data: result
      });
    }

    const foundContract = await Contract.findById(contractId)
      .populate('client')
      .populate('freelancer')
      .populate('source.job')
      .populate('source.gig');

    if (!foundContract) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contract not found' }
      });
    }

    if (
      foundContract.client._id.toString() !== userId.toString() &&
      foundContract.freelancer._id.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not a participant in this contract.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: foundContract
    });
  } catch (error) {
    next(error);
  }
};

const addMilestone = async (req, res, next) => {
  try {
    const contractId = req.params.id || req.params.contractId;
    const clientId = req.user._id || req.user.id || req.user.userId;
    const milestoneData = req.body;

    if (contractsService && typeof contractsService.addMilestone === 'function') {
      const result = await contractsService.addMilestone(contractId, clientId, milestoneData);
      return res.status(201).json({
        success: true,
        data: result
      });
    }

    const foundContract = await Contract.findById(contractId);

    if (!foundContract) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contract not found' }
      });
    }

    if (foundContract.client.toString() !== clientId.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to create a milestone for this contract.' }
      });
    }

    if (foundContract.status !== 'active') {
      return res.status(422).json({
        success: false,
        error: { code: 'INVALID_STATE', message: `Cannot add a milestone to a ${foundContract.status} contract` }
      });
    }

    const milestoneDetails = {
      title: req.body.title,
      description: req.body.description,
      amount: req.body.amount,
      dueDate: req.body.dueDate,
      status: 'pending'
    };

    foundContract.milestones.push(milestoneDetails);
    await foundContract.save();

    return res.status(201).json({
      success: true,
      data: foundContract
    });
  } catch (error) {
    next(error);
  }
};

const editMilestone = async (req, res, next) => {
  try {
    const contractId = req.params.id || req.params.contractId;
    const milestoneId = req.params.mid || req.params.milestoneId;
    const userId = req.user._id || req.user.id || req.user.userId;

    const foundContract = await Contract.findById(contractId);

    if (!foundContract) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contract not found' }
      });
    }

    if (foundContract.client.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to edit a milestone for this contract.' }
      });
    }

    const foundMilestone = foundContract.milestones.id(milestoneId);

    if (!foundMilestone) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Milestone not found' }
      });
    }

    if (foundMilestone.status !== 'pending') {
      return res.status(422).json({
        success: false,
        error: { code: 'ESCROW_LOCKED', message: 'You can only edit unfunded milestones. Once funded, the terms are locked in escrow.' }
      });
    }

    if (req.body.amount && Number(req.body.amount) !== foundMilestone.amount) {
      foundContract.totalAmount -= foundMilestone.amount;
      foundContract.totalAmount += Number(req.body.amount);
      foundMilestone.amount = Number(req.body.amount);
    }

    if (req.body.title) foundMilestone.title = req.body.title;
    if (req.body.description) foundMilestone.description = req.body.description;
    if (req.body.dueDate) foundMilestone.dueDate = req.body.dueDate;

    await foundContract.save();

    return res.status(200).json({
      success: true,
      data: foundContract
    });
  } catch (err) {
    next(err);
  }
};

const fundMilestone = async (req, res, next) => {
  try {
    const contractId = req.params.id || req.params.contractId;
    const milestoneId = req.params.mid || req.params.milestoneId;
    const clientId = req.user._id || req.user.id || req.user.userId;

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
    const contractId = req.params.id || req.params.contractId;
    const milestoneId = req.params.mid || req.params.milestoneId;
    const freelancerId = req.user._id || req.user.id || req.user.userId;
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
    const contractId = req.params.id || req.params.contractId;
    const milestoneId = req.params.mid || req.params.milestoneId;
    const clientId = req.user._id || req.user.id || req.user.userId;

    const result = await contractsService.approveMilestone(contractId, milestoneId, clientId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const requestMilestoneRevision = async (req, res, next) => {
  try {
    const contractId = req.params.id || req.params.contractId;
    const milestoneId = req.params.mid || req.params.milestoneId;
    const clientId = req.user._id || req.user.id || req.user.userId;
    const { note } = req.body;

    const result = await contractsService.requestMilestoneRevision(
      contractId,
      milestoneId,
      clientId,
      note
    );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const cancelContract = async (req, res, next) => {
  try {
    const contractId = req.params.id || req.params.contractId;
    const userId = req.user._id || req.user.id || req.user.userId;
    const role = req.user.role;

    const result = await contractsService.cancelContract(contractId, userId, role);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const disputeMilestone = async (req, res, next) => {
  try {
    const contractId = req.params.id || req.params.contractId;
    const milestoneId = req.params.mid || req.params.milestoneId;
    const userId = req.user._id || req.user.id || req.user.userId;
    const { reason, evidence } = req.body;

    const result = await contractsService.disputeMilestone(
      contractId,
      milestoneId,
      userId,
      reason,
      evidence
    );

    return res.status(201).json({
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
  editMilestone,
  fundMilestone,
  deliverMilestone,
  approveMilestone,
  requestMilestoneRevision,
  cancelContract,
  disputeMilestone
};