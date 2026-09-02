const User = require('../../models/User')
const Job = require('../../models/Job')
const Proposal = require('../../models/Proposal')
const Contract = require('../../models/Contract')

const getStats = async function (req, res, next) {
    try {
        const role = req.user.role
        const userId = req.user.id || req.user._id

        let stats = {}

        if (role === 'admin') {
            const totalUsers = await User.countDocuments()
            const activeJobs = await Job.countDocuments({ status: 'open' })
            const totalContracts = await Contract.countDocuments()
            
            const allContracts = await Contract.find()
            const totalVolume = allContracts.reduce((sum, contract) => sum + (contract.totalAmount || 0), 0)
            const revenue = totalVolume * 0.10

            stats = { totalUsers, activeJobs, totalContracts, revenue }
        } 
        else if (role === 'client') {
            const activeContracts = await Contract.countDocuments({ client: userId, status: { $in: ['active', 'in_progress', 'pending'] } })
            const openJobs = await Job.countDocuments({ client: userId, status: 'open' })
            
            const myContracts = await Contract.find({ client: userId })
            const financialTotal = myContracts.reduce((sum, contract) => sum + (contract.totalAmount || 0), 0)

            stats = { activeContracts, financialTotal, actionableItems: openJobs }
        } 
        else if (role === 'freelancer') {
            const activeContracts = await Contract.countDocuments({ freelancer: userId, status: { $in: ['active', 'in_progress', 'pending'] } })
            const pendingProposals = await Proposal.countDocuments({ freelancer: userId, status: 'pending' })
            
            const myContracts = await Contract.find({ freelancer: userId, status: 'completed' })
            const financialTotal = myContracts.reduce((sum, contract) => sum + (contract.totalAmount || 0), 0)

            stats = { activeContracts, financialTotal, actionableItems: pendingProposals }
        }

        res.status(200).json({
            success: true,
            data: stats
        })
    } catch (error) {
        res.status(400)
        next(error)
    }
}

module.exports = {
    getStats
}