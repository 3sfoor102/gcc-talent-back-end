const mongoose = require('mongoose');
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

  if (contract.status !== 'active') {
    const error = new Error(`Cannot add milestones to a contract with status '${contract.status}'`);
    error.statusCode = 422;
    throw error;
  }

  const newMilestone = {
    title: milestoneData.title,
    description: milestoneData.description,
    amount: Number(milestoneData.amount),
    dueDate: milestoneData.dueDate,
    status: 'pending',
    escrowAmount: 0
  };

  contract.milestones.push(newMilestone);
  contract.totalAmount += newMilestone.amount;

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
    if (!milestone) {
      const error = new Error('Milestone not found');
      error.statusCode = 404;
      throw error;
    }

    if (milestone.status !== 'pending') {
      const error = new Error(`Cannot fund milestone with status '${milestone.status}'. Must be 'pending'`);
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

    await Transaction.create(
      [
        {
          user: clientId,
          type: 'escrow_fund',
          amount: milestone.amount,
          direction: 'debit',
          balanceAfter: user.wallet.available,
          contract: contractId,
          milestoneId: milestoneId,
          status: 'completed',
          reference: `EF-${contractId}-${milestoneId}-${Date.now()}`
        }
      ],
      { session }
    );

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
  if (!milestone) {
    const error = new Error('Milestone not found');
    error.statusCode = 404;
    throw error;
  }

  if (!['funded', 'revision_requested'].includes(milestone.status)) {
    const error = new Error(`Cannot deliver a milestone with status '${milestone.status}'. Must be 'funded' or 'revision_requested'`);
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

const requestMilestoneRevision = async (contractId, milestoneId, clientId, note) => {
  const contract = await Contract.findOne({ _id: contractId, client: clientId });
  if (!contract) {
    const error = new Error('Contract not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const milestone = contract.milestones.id(milestoneId);
  if (!milestone) {
    const error = new Error('Milestone not found');
    error.statusCode = 404;
    throw error;
  }

  if (milestone.status !== 'delivered') {
    const error = new Error(`Cannot request revisions on a milestone with status '${milestone.status}'. Milestone must be 'delivered'`);
    error.statusCode = 422;
    throw error;
  }

  if (milestone.deliveries && milestone.deliveries.length > 0) {
    const latestDelivery = milestone.deliveries[milestone.deliveries.length - 1];
    latestDelivery.response = 'revision';
    latestDelivery.responseNote = note || 'Client requested revisions';
    latestDelivery.respondedAt = new Date();
  }

  milestone.status = 'revision_requested';
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
      const error = new Error('Milestone must be in delivered state before approval');
      error.statusCode = 422;
      throw error;
    }

    const platformFeePct = parseInt(process.env.PLATFORM_FEE_PCT || '10', 10);
    const platformFee = Math.round(((milestone.escrowAmount * platformFeePct) / 100) * 100) / 100;
    const freelancerPayout = Math.round((milestone.escrowAmount - platformFee) * 100) / 100;

    const freelancer = await User.findById(contract.freelancer).session(session);
    if (!freelancer) {
      const error = new Error('Freelancer account record not found');
      error.statusCode = 404;
      throw error;
    }

    freelancer.wallet.available += freelancerPayout;
    await freelancer.save({ session });

    milestone.status = 'approved';
    milestone.approvedAt = new Date();
    milestone.escrowAmount = 0;

    if (milestone.deliveries && milestone.deliveries.length > 0) {
      const latestDelivery = milestone.deliveries[milestone.deliveries.length - 1];
      latestDelivery.response = 'approved';
      latestDelivery.respondedAt = new Date();
    }

    const allApproved = contract.milestones.every((m) => m.status === 'approved');
    if (allApproved) {
      contract.status = 'completed';
      contract.completedAt = new Date();
    }
    await contract.save({ session });

    await Transaction.create(
      [
        {
          user: freelancer._id,
          type: 'escrow_release',
          amount: freelancerPayout,
          direction: 'credit',
          balanceAfter: freelancer.wallet.available,
          contract: contractId,
          milestoneId: milestoneId,
          status: 'completed',
          reference: `ER-${contractId}-${milestoneId}-${Date.now()}`
        },
        {
          user: null,
          type: 'platform_fee',
          amount: platformFee,
          direction: 'credit',
          contract: contractId,
          milestoneId: milestoneId,
          status: 'completed',
          reference: `PF-${contractId}-${milestoneId}-${Date.now()}`
        }
      ],
      { session }
    );

    await session.commitTransaction();
    return { contract, freelancerWallet: freelancer.wallet };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const cancelContract = async (contractId, userId, role) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contract = await Contract.findById(contractId).session(session);
    if (!contract) {
      const error = new Error('Contract not found');
      error.statusCode = 404;
      throw error;
    }

    const isClient = contract.client.toString() === userId.toString();
    const isFreelancer = contract.freelancer.toString() === userId.toString();

    if (!isClient && !isFreelancer && role !== 'admin') {
      const error = new Error('You do not have permission to cancel this contract');
      error.statusCode = 403;
      throw error;
    }

    if (contract.status !== 'active') {
      const error = new Error(`Cannot cancel a contract with status '${contract.status}'`);
      error.statusCode = 422;
      throw error;
    }

    let refundableEscrow = 0;
    contract.milestones.forEach((m) => {
      if (['funded', 'delivered', 'revision_requested'].includes(m.status)) {
        refundableEscrow += m.escrowAmount || 0;
        m.escrowAmount = 0;
        m.status = 'refunded';
      } else if (m.status === 'pending') {
        m.status = 'cancelled';
      }
    });

    if (refundableEscrow > 0) {
      const clientUser = await User.findById(contract.client).session(session);
      if (!clientUser) {
        const error = new Error('Client record not found');
        error.statusCode = 404;
        throw error;
      }

      clientUser.wallet.available += refundableEscrow;
      await clientUser.save({ session });

      await Transaction.create(
        [
          {
            user: clientUser._id,
            type: 'escrow_refund',
            amount: refundableEscrow,
            direction: 'credit',
            balanceAfter: clientUser.wallet.available,
            contract: contract._id,
            status: 'completed',
            reference: `RF-${contract._id}-${Date.now()}`,
            meta: { reason: 'Contract cancelled', cancelledBy: userId }
          }
        ],
        { session }
      );
    }

    contract.status = 'cancelled';
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

const disputeMilestone = async (contractId, milestoneId, userId, reason, evidence) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contract = await Contract.findById(contractId).session(session);
    if (!contract) {
      const error = new Error('Contract not found');
      error.statusCode = 404;
      throw error;
    }

    const isClient = contract.client.toString() === userId.toString();
    const isFreelancer = contract.freelancer.toString() === userId.toString();

    if (!isClient && !isFreelancer) {
      const error = new Error('You do not have permission to dispute this contract');
      error.statusCode = 403;
      throw error;
    }

    const milestone = contract.milestones.id(milestoneId);
    if (!milestone) {
      const error = new Error('Milestone not found');
      error.statusCode = 404;
      throw error;
    }

    if (!['funded', 'delivered', 'revision_requested'].includes(milestone.status)) {
      const error = new Error(`Cannot dispute milestone with status '${milestone.status}'`);
      error.statusCode = 422;
      throw error;
    }

    const counterParty = isClient ? contract.freelancer : contract.client;

    milestone.status = 'disputed';
    await contract.save({ session });

    const [dispute] = await Dispute.create(
      [
        {
          contract: contractId,
          milestoneId: milestone._id,
          openedBy: userId,
          against: counterParty,
          reason,
          evidence: evidence || [],
          status: 'open'
        }
      ],
      { session }
    );

    await session.commitTransaction();
    return { contract, dispute };
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
  requestMilestoneRevision,
  approveMilestone,
  cancelContract,
  disputeMilestone
};