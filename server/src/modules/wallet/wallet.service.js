const mongoose = require('mongoose')
const User = require('../../models/User.js')
const Transaction = require('../../models/Transaction.js')

const getUserWallet = async (userId) => {
    const user = await findById(userId).select('wallet')
    if (!user) {
        const error = new Error('User not found!')
        error.statusCode = 404
        throw error
    }

    const transactions = await Transaction.find({user: userId}).sort({createdAt: -1})
    return {
        wallet: user.wallet, 
        transactions: transactions
}
}

const processDeposit = async(userId, amount, cardNumber) => {
    if (cardNumber.startWith('4000')) {
        const error = new Error ("Payment Declined: Insufficient funds or invalid card")
        error.statusCode = 402
        throw error
    }
    if (!cardNumber.startWith('4242')) {
        const error = new Error('Paymed Failed: Invalid Card')
        error.statusCode = 400
        throw error
    }
const session = await mongoose.startSession()





}   

