const mongoose = require('mongoose');
const Contract = require('../../models/Contract.js');
const User = require('../../models/User.js');
const Transaction = require('../../models/Transaction.js');

const getUserContracts = async (userId, role, status) => {
  const query = { [role]: userId };
  if (status) query.status = status;

  return await Contract.find(query)
    .populate(role === 'client' ? 'freelancer' : 'client', 'name avatarUrl')
    .sort({ createdAt: -1 });
};

const getContractWorkspace = async (contractId, userId, role) => {
  const contract = await Contract.findOne({ _id: contractId, [role]: userId })
    .populate('client freelancer', 'name avatarUrl');

  if (!contract) {
    const error = new Error('Contract not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }
  return contract;
};

const addMilestone = async (contractId, clientId, milestoneData) => {
  const contract = await Contract.findOne({ _id: contractId, client: clientId });
  if (!contract) {
    const error = new Error('Contract not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  contract.milestones.push({
    title: milestoneData.title,
    description: milestoneData.description,
    amount: milestoneData.amount,
    dueDate: milestoneData.dueDate,
    status: 'pending',
    escrowAmount: 0
  });

  await contract.save();
  return contract;
};

const fundMilestone = async (contractId, milestoneId, clientId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contract = await Contract.findOne({ _id: contractId, client: clientId }).session(session);
    const user = await User.findById(clientId).session(session);

    if (!contract || !user) {
      const error = new Error('Contract or Client not found');
      error.statusCode = 404;
      throw error;
    }

    const milestone = contract.milestones.id(milestoneId);
    if (!milestone || milestone.status !== 'pending') {
      const error = new Error('Milestone not found or not in pending state');
      error.statusCode = 422;
      throw error;
    }

    if (user.wallet.available < milestone.amount) {
      const error = new Error('Insufficient available funds in wallet');
      error.statusCode = 422;
      throw error;
    }

    user.wallet.available -= milestone.amount;
    milestone.escrowAmount = milestone.amount;
    milestone.status = 'funded';
    milestone.fundedAt = new Date();

    await user.save({ session });
    await contract.save({ session });

    await Transaction.create([{
      user: clientId,
      type: 'escrow_fund',
      amount: milestone.amount,
      direction: 'debit',
      balanceAfter: user.wallet.available,
      contract: contractId,
      milestoneId: milestoneId,
      status: 'completed'
    }], { session });

    await session.commitTransaction();
    return { contract, wallet: user.wallet };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const deliverMilestone = async (contractId, milestoneId, freelancerId, deliveryData) => {
  const contract = await Contract.findOne({ _id: contractId, freelancer: freelancerId });
  if (!contract) {
    const error = new Error('Contract not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const milestone = contract.milestones.id(milestoneId);
  if (!milestone || milestone.status !== 'funded') {
    const error = new Error('Milestone must be funded before delivery');
    error.statusCode = 422;
    throw error;
  }

  milestone.deliveries.push({
    message: deliveryData.message,
    attachments: deliveryData.attachments || [],
    submittedAt: new Date()
  });
  milestone.status = 'delivered';
  milestone.deliveredAt = new Date();

  await contract.save();
  return contract;
};

const approveMilestone = async (contractId, milestoneId, clientId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contract = await Contract.findOne({ _id: contractId, client: clientId }).session(session);
    if (!contract) {
      const error = new Error('Contract not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const milestone = contract.milestones.id(milestoneId);
    if (!milestone || milestone.status !== 'delivered') {
      const error = new Error('Milestone must be delivered before approval');
      error.statusCode = 422;
      throw error;
    }

    const platformFeePct = parseInt(process.env.PLATFORM_FEE_PCT || '10', 10);
    const platformFee = (milestone.escrowAmount * platformFeePct) / 100;
    const freelancerPayout = milestone.escrowAmount - platformFee;

    const freelancer = await User.findById(contract.freelancer).session(session);
    freelancer.wallet.available += freelancerPayout;
    await freelancer.save({ session });

    milestone.status = 'approved';
    milestone.approvedAt = new Date();
    milestone.escrowAmount = 0;

    const allApproved = contract.milestones.every(m => m.status === 'approved');
    if (allApproved) {
      contract.status = 'completed';
      contract.completedAt = new Date();
    }
    await contract.save({ session });

    await Transaction.create([
      {
        user: freelancer._id,
        type: 'escrow_release',
        amount: freelancerPayout,
        direction: 'credit',
        balanceAfter: freelancer.wallet.available,
        contract: contractId,
        milestoneId: milestoneId,
        status: 'completed'
      },
      {
        user: null,
        type: 'platform_fee',
        amount: platformFee,
        direction: 'credit',
        contract: contractId,
        milestoneId: milestoneId,
        status: 'completed'
      }
    ], { session });

    await session.commitTransaction();
    return { contract, freelancerWallet: freelancer.wallet };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};



module.exports = {
  getUserContracts,
  getContractWorkspace,
  addMilestone,
  fundMilestone,
  deliverMilestone,
  approveMilestone,
};