const User = require('../../models/User')

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).sort('-createdAt')
        
        res.status(200).json({
            success: true,
            data: users
        })
    } catch (error) {
        next(error)
    }
}

module.exports = {
    getAllUsers
}