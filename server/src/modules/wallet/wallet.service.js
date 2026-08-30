const mongoose = require('mongoose');
const User = require('../../models/User.js');
const Transaction = require('../../models/Transaction.js');
const crypto = require('crypto'); 

const getUserWallet = async (userId) => {
  const user = await User.findById(userId).select('wallet');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 });
  return { wallet: user.wallet, transactions };
};

const processDeposit = async (userId, amount, cardNumber) => {
  if (cardNumber && cardNumber.startsWith('4000')) {
    const error = new Error('Payment Declined: Insufficient funds or invalid card');
    error.statusCode = 402;
    throw error;
  }
  if (!cardNumber || !cardNumber.startsWith('4242')) {
    const error = new Error('Payment Failed: Invalid test card');
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    user.wallet.available += amount;
    await user.save({ session });
    const uniqueReference = `DEP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

    const transaction = await Transaction.create([{
      user: userId,
      type: 'deposit',
      amount,
      direction: 'credit',
      balanceAfter: user.wallet.available,
      reference: uniqueReference,
      status: 'completed',
      meta: { cardLast4: cardNumber.slice(-4) }
    }], { session });

    await session.commitTransaction();
    return { wallet: user.wallet, transaction: transaction[0] };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const processWithdrawal = async (userId, amount, method) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.wallet.available < amount) {
      const error = new Error('Insufficient available funds for withdrawal');
      error.statusCode = 422;
      throw error;
    }

    user.wallet.available -= amount;
    await user.save({ session });
    const transaction = await Transaction.create([{
      user: userId,
      type: 'withdrawal',
      amount,
      direction: 'debit',
      balanceAfter: user.wallet.available,
      status: 'completed',
      meta: { method }
    }], { session });

    await session.commitTransaction();
    return { wallet: user.wallet, transaction: transaction[0] };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = { getUserWallet, processDeposit, processWithdrawal };