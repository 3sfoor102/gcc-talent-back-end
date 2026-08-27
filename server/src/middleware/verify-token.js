const jwt = require('jsonwebtoken')

const verifyToken = function (req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1]
        
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

        req.user = decoded
        
        next()
    } catch (err) {
        res.status(401).json({ err: 'Invalid token' })
    }
}

module.exports = verifyToken