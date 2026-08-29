const contractService = require('./contracts.service.js')

const getContracts = async (req, res, next) => {
    try {
        const userId = req.user._id
        const role = req.user.role
        const {status} = req.query

        const result = await contractService.getUserContracts(userId, role, status)

        res.status(200).json({
            success: true, 
            data: result,
     })

    } catch (error) {
        next(error)
    }
    
}