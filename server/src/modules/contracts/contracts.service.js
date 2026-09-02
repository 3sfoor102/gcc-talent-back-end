const mongoose = require('mongoose');
const crypto = require('crypto');
const Contract = require('../../models/Contract.js');
const User = require('../../models/User.js');
const Transaction = require('../../models/Transaction.js');
const Dispute = require('../../models/Dispute.js');

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

  contract.activity.push({
    type: 'milestone_add',
    by: clientId,
    message: `Added new milestone: ${milestoneData.title}`,
    at: new Date()
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

    await Transaction.create([{
      user: clientId,
      type: 'escrow_fund',
      amount: milestone.amount,
      direction: 'debit',
      balanceAfter: user.wallet.available,
      contract: contractId,
      milestoneId: milestoneId,
      reference: `ESC-FUND-${milestoneId}-${crypto.randomBytes(4).toString('hex')}`,
      status: 'completed'
    }], { session });

    contract.activity.push({
      type: 'milestone_fund',
      by: clientId,
      message: `Funded milestone: ${milestone.title}`,
      at: new Date()
    });

    await user.save({ session });
    await contract.save({ session });
    
    await session.commitTransaction();
    return { contract, wallet: user.wallet };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const startMilestone = async (contractId, milestoneId, freelancerId) => {
  const contract = await Contract.findOne({ _id: contractId, freelancer: freelancerId });
  if (!contract) {
    const error = new Error('Contract not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const milestone = contract.milestones.id(milestoneId);
  
  if (!milestone || milestone.status !== 'funded') {
    const error = new Error('Milestone must be funded before work can begin');
    error.statusCode = 422;
    throw error;
  }

  milestone.status = 'in_progress';

  contract.activity.push({
    type: 'milestone_start',
    by: freelancerId,
    message: `Started work on milestone: ${milestone.title}`,
    at: new Date()
  });

  await contract.save();
  return contract;
};

const deliverMilestone = async (contractId, milestoneId, freelancerId, deliveryData) => {
  const contract = await Contract.findOne({ _id: contractId, freelancer: freelancerId });
  if (!contract) {
    const error = new Error('Contract not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const milestone = contract.milestones.id(milestoneId);
  
  if (!milestone || milestone.status !== 'in_progress') {
    const error = new Error('Milestone must be in progress before delivery');
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

  contract.activity.push({
    type: 'milestone_deliver',
    by: freelancerId,
    message: `Delivered milestone: ${milestone.title}`,
    at: new Date()
  });

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

    await Transaction.create([
      {
        user: freelancer._id,
        type: 'escrow_release',
        amount: freelancerPayout,
        direction: 'credit',
        balanceAfter: freelancer.wallet.available,
        contract: contractId,
        milestoneId: milestoneId,
        reference: `ESC-REL-${milestoneId}-${crypto.randomBytes(4).toString('hex')}`,
        status: 'completed'
      },
      {
        user: null,
        type: 'platform_fee',
        amount: platformFee,
        direction: 'credit',
        contract: contractId,
        milestoneId: milestoneId,
        reference: `PLAT-FEE-${milestoneId}-${crypto.randomBytes(4).toString('hex')}`,
        status: 'completed'
      }
    ], { session });

    contract.activity.push({
      type: 'milestone_approve',
      by: clientId,
      message: `Approved milestone: ${milestone.title}`,
      at: new Date()
    });

    await contract.save({ session });

    await session.commitTransaction();
    return { contract, freelancerWallet: freelancer.wallet };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const requestMilestoneRevision = async (contractId, milestoneId, clientId, note) => {
  const contract = await Contract.findOne({ _id: contractId, client: clientId });
  if (!contract) {
    const error = new Error('Contract not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const milestone = contract.milestones.id(milestoneId);
  if (!milestone || milestone.status !== 'delivered') {
    const error = new Error('Milestone must be delivered to request a revision');
    error.statusCode = 422;
    throw error;
  }

  milestone.status = 'revision_requested';
  
  const lastDelivery = milestone.deliveries[milestone.deliveries.length - 1];
  if (lastDelivery) {
    lastDelivery.response = 'revision';
    lastDelivery.responseNote = note;
    lastDelivery.respondedAt = new Date();
  }

  contract.activity.push({
    type: 'milestone_revision',
    by: clientId,
    message: `Requested revision for milestone: ${milestone.title}`,
    at: new Date()
  });

  await contract.save();
  return contract;
};

const cancelContract = async (contractId, userId, role) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const query = { _id: contractId };
    query[role] = userId;
    
    const contract = await Contract.findOne(query).session(session);
    if (!contract) {
      const error = new Error('Contract not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    if (contract.status === 'completed' || contract.status === 'cancelled') {
      const error = new Error(`Cannot cancel a ${contract.status} contract`);
      error.statusCode = 422;
      throw error;
    }

    const client = await User.findById(contract.client).session(session);

    for (const milestone of contract.milestones) {
      if (['funded', 'in_progress', 'delivered', 'revision_requested'].includes(milestone.status)) {
        client.wallet.available += milestone.escrowAmount;
        
        await Transaction.create([{
          user: client._id,
          type: 'escrow_refund',
          amount: milestone.escrowAmount,
          direction: 'credit',
          balanceAfter: client.wallet.available,
          contract: contractId,
          milestoneId: milestone._id,
          reference: `ESC-REF-${milestone._id}-${crypto.randomBytes(4).toString('hex')}`,
          status: 'completed'
        }], { session });

        milestone.escrowAmount = 0;
      }
      
      if (milestone.status !== 'approved') {
        milestone.status = 'cancelled';
      }
    }

    contract.status = 'cancelled';
    contract.activity.push({
      type: 'contract_cancel',
      by: userId,
      message: 'Contract was cancelled and applicable escrow refunded',
      at: new Date()
    });

    await client.save({ session });
    await contract.save({ session });
    
    await session.commitTransaction();
    return contract;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const openDispute = async (contractId, milestoneId, userId, reason, evidence) => {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    const error = new Error('Contract not found');
    error.statusCode = 404;
    throw error;
  }

  const isClient = contract.client.toString() === userId.toString();
  const isFreelancer = contract.freelancer.toString() === userId.toString();
  
  if (!isClient && !isFreelancer) {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  const milestone = contract.milestones.id(milestoneId);
  if (!milestone || !['funded', 'in_progress', 'delivered', 'revision_requested'].includes(milestone.status)) {
    const error = new Error('Can only dispute milestones with locked escrow');
    error.statusCode = 422;
    throw error;
  }

  milestone.status = 'disputed';

  const dispute = await Dispute.create({
    contract: contractId,
    milestoneId: milestoneId,
    openedBy: userId,
    against: isClient ? contract.freelancer : contract.client,
    reason,
    evidence: evidence || []
  });

  contract.activity.push({
    type: 'dispute_opened',
    by: userId,
    message: `Dispute opened on milestone: ${milestone.title}`,
    at: new Date()
  });

  await contract.save();
  return { contract, dispute };
};

module.exports = {
  getUserContracts,
  getContractWorkspace,
  addMilestone,
  fundMilestone,
  startMilestone,
  deliverMilestone,
  approveMilestone,
  requestMilestoneRevision,
  cancelContract,
  openDispute
};