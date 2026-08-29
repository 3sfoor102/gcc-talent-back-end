const contractService = require('./contracts.service.js')

const getContracts = async (req, res, next) => {
    try {
        const userId = req.user._id
        const role = req.user.role
    } catch (error) {
        
    }
}