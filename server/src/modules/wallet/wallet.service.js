const mongoose = require('mongoose')
const User = require('../../models/User.js')
const Transaction = require('../../models/Transaction.js')

const getUserWallet = async (userId) => {
    const user = await findById(userId).select('wallet')
}

if (!user) {
    const error = new Error('User not found!')

}