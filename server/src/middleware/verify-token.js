const jwt = require('jsonwebtoken')
const User = require('../models/User')

const verifyToken = async function (req, res, next) 
{
    try {
        const token = req.headers.authorization.split(' ')[1]
        
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

        const user = await User.findById(decoded.id || decoded._id).select('status')
        
        if (!user) {
            return res.status(401).json({ err: 'User not found' })
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ err: 'Account suspended' })
        }

        req.user = decoded
        next()
    } catch (err) {
        res.status(401).json({ err: 'Invalid token' })
    }
}

module.exports = verifyToken