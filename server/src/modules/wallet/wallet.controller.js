const walletService = require("./wallet.service.js");
const getWallet = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id || req.user.userId;
    const result = await walletService.getUserWallet(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deposit = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id || req.user.userId;
    const { amount, card } = req.body;
    const cardNumber = typeof card === 'string' ? card : (card?.number || "");
    const result = await walletService.processDeposit(
      userId,
      amount,
      cardNumber,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const withdraw = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id || req.user.userId;
    const { amount, method } = req.body;

    const result = await walletService.processWithdrawal(
      userId,
      amount,
      method,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id || req.user.userId;
    const { transactions, page, limit, total } =
      await walletService.getUserTransactions(userId, req.query);
    res.status(200).json({
      success: true,
      data: transactions,
      meta: { page, limit, total },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { deposit, getWallet, withdraw, getTransactions };
