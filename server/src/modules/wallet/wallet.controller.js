
const User = require('../')

const getWallet = async (req, res, next) => {
    try {
        const userId = req.user._id
        const result = await walletService.getUserWallet(userId)

        res.status(200).json({
            success: true,
            data: result,
        })
    } catch (error) {
        next(error)
    }
}


const deposit = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const { amount, card } = req.body;

    const result = await walletService.processDeposit(userId, amount, card);

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
        const userId = req.user._id
        const {amount, method} = req.body

        const result = await walletService.processWithdrawal(userId, amount, method) 
        
        res.status(200).json({
            success: true, 
            data: result, 
        })
    } catch (error) {
        next(error)
    }
}

module.exports = { deposit, getWallet, withdraw };
