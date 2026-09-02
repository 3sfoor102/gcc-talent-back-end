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

    const milestone = contract.milestones.id(milestoneId) || contract.milestones.find(m => m._id.toString() === milestoneId.toString());
    if (!milestone) {
      const error = new Error('Milestone not found');
      error.statusCode = 404;
      throw error;
    }

    if (milestone.status !== 'delivered') {
      const error = new Error(`Milestone must be delivered before approval (Current status: ${milestone.status})`);
      error.statusCode = 422;
      throw error;
    }

    // Safely fallback to milestone.amount if escrowAmount is missing
    const escrowValue = Number(milestone.escrowAmount || milestone.amount || 0);
    const platformFeePct = parseInt(process.env.PLATFORM_FEE_PCT || '10', 10);
    const platformFee = (escrowValue * platformFeePct) / 100;
    const freelancerPayout = escrowValue - platformFee;

    const freelancer = await User.findById(contract.freelancer).session(session);
    if (!freelancer) {
      const error = new Error('Freelancer user not found');
      error.statusCode = 404;
      throw error;
    }

    // Ensure wallet object exists to prevent undefined property errors
    if (!freelancer.wallet) {
      freelancer.wallet = { available: 0, pending: 0 };
    }
    freelancer.wallet.available = Number(freelancer.wallet.available || 0) + freelancerPayout;
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
        reference: `ESC-REL-${milestoneId}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        status: 'completed'
      },
      {
        type: 'platform_fee',
        amount: platformFee,
        direction: 'credit',
        contract: contractId,
        milestoneId: milestoneId,
        reference: `PLAT-FEE-${milestoneId}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        status: 'completed'
      }
    ], { session, ordered: true });;

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
    console.error("CRITICAL approveMilestone Error Stack:", error);
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

const resolveDispute = async (disputeId, adminId, { outcome, freelancerPct, note }) => {
  if (!['release', 'refund', 'split'].includes(outcome)) {
    const error = new Error('Invalid dispute outcome');
    error.statusCode = 400;
    throw error;
  }

  if (outcome === 'split' && (freelancerPct === undefined || freelancerPct < 0 || freelancerPct > 100)) {
    const error = new Error('freelancerPct must be between 0 and 100 for split outcome');
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute || dispute.status === 'resolved') {
      const error = new Error('Dispute not found or already resolved');
      error.statusCode = 404;
      throw error;
    }

    const contract = await Contract.findById(dispute.contract).session(session);
    if (!contract) {
      const error = new Error('Contract not found');
      error.statusCode = 404;
      throw error;
    }

    const milestone = contract.milestones.id(dispute.milestoneId);
    if (!milestone || milestone.status !== 'disputed') {
      const error = new Error('Milestone not found or not in disputed state');
      error.statusCode = 422;
      throw error;
    }

    const client = await User.findById(contract.client).session(session);
    const freelancer = await User.findById(contract.freelancer).session(session);

    if (!client || !freelancer) {
      const error = new Error('Contract parties not found');
      error.statusCode = 404;
      throw error;
    }

    const totalEscrow = Number(milestone.escrowAmount || milestone.amount || 0);
    const platformFeePct = parseInt(process.env.PLATFORM_FEE_PCT || '10', 10);
    const transactions = [];

    if (outcome === 'release') {
      const fee = (totalEscrow * platformFeePct) / 100;
      const payout = totalEscrow - fee;

      freelancer.wallet.available += payout;
      await freelancer.save({ session });

      transactions.push(
        {
          user: freelancer._id,
          type: 'escrow_release',
          amount: payout,
          direction: 'credit',
          balanceAfter: freelancer.wallet.available,
          contract: contract._id,
          milestoneId: milestone._id,
          reference: `DISP-REL-${dispute._id}-${crypto.randomBytes(4).toString('hex')}`,
          status: 'completed'
        },
        {
          type: 'platform_fee',
          amount: fee,
          direction: 'credit',
          contract: contract._id,
          milestoneId: milestone._id,
          reference: `DISP-FEE-${dispute._id}-${crypto.randomBytes(4).toString('hex')}`,
          status: 'completed'
        }
      );

      milestone.status = 'approved';
      milestone.approvedAt = new Date();
    } else if (outcome === 'refund') {
      client.wallet.available += totalEscrow;
      await client.save({ session });

      transactions.push({
        user: client._id,
        type: 'escrow_refund',
        amount: totalEscrow,
        direction: 'credit',
        balanceAfter: client.wallet.available,
        contract: contract._id,
        milestoneId: milestone._id,
        reference: `DISP-REF-${dispute._id}-${crypto.randomBytes(4).toString('hex')}`,
        status: 'completed'
      });

      milestone.status = 'refunded';
    } else if (outcome === 'split') {
      const freelancerShare = (totalEscrow * freelancerPct) / 100;
      const clientShare = totalEscrow - freelancerShare;

      const fee = (freelancerShare * platformFeePct) / 100;
      const payout = freelancerShare - fee;

      if (payout > 0) {
        freelancer.wallet.available += payout;
        await freelancer.save({ session });

        transactions.push({
          user: freelancer._id,
          type: 'escrow_release',
          amount: payout,
          direction: 'credit',
          balanceAfter: freelancer.wallet.available,
          contract: contract._id,
          milestoneId: milestone._id,
          reference: `DISP-SPLIT-F-${dispute._id}-${crypto.randomBytes(4).toString('hex')}`,
          status: 'completed'
        });
      }

      if (fee > 0) {
        transactions.push({
          type: 'platform_fee',
          amount: fee,
          direction: 'credit',
          contract: contract._id,
          milestoneId: milestone._id,
          reference: `DISP-SPLIT-FEE-${dispute._id}-${crypto.randomBytes(4).toString('hex')}`,
          status: 'completed'
        });
      }

      if (clientShare > 0) {
        client.wallet.available += clientShare;
        await client.save({ session });

        transactions.push({
          user: client._id,
          type: 'escrow_refund',
          amount: clientShare,
          direction: 'credit',
          balanceAfter: client.wallet.available,
          contract: contract._id,
          milestoneId: milestone._id,
          reference: `DISP-SPLIT-C-${dispute._id}-${crypto.randomBytes(4).toString('hex')}`,
          status: 'completed'
        });
      }

      milestone.status = 'split';
    }

    milestone.escrowAmount = 0;

    await Transaction.create(transactions, { session, ordered: true });

    dispute.status = 'resolved';
    dispute.resolution = {
      outcome,
      freelancerPct: outcome === 'split' ? freelancerPct : undefined,
      note,
      resolvedBy: adminId,
      at: new Date()
    };
    await dispute.save({ session });

    contract.activity.push({
      type: 'dispute_resolved',
      by: adminId,
      message: `Dispute resolved with outcome: ${outcome}`,
      at: new Date()
    });

    const allResolved = contract.milestones.every((m) =>
      ['approved', 'refunded', 'split', 'cancelled'].includes(m.status)
    );
    if (allResolved) {
      contract.status = 'completed';
      contract.completedAt = new Date();
    }

    await contract.save({ session });

    await session.commitTransaction();
    return { dispute, contract };
  } catch (error) {
    await session.abortTransaction();
    console.error("resolveDispute Error:", error);
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
  startMilestone,
  deliverMilestone,
  approveMilestone,
  requestMilestoneRevision,
  cancelContract,
  openDispute,
  resolveDispute,
};