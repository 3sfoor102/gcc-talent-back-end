const jwt = require('jsonwebtoken')

const bcrypt = require('bcrypt')

const User = require('../../models/User')


const generateAccessToken = function (id, role)
{
    return jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES })
}


const registerUser = async function (userData)
{
    const { name, email, password, role } = userData

    const userExists = await User.findOne({ email })

    if (userExists)
    {
        throw new Error('Email is already registered')
    }

    const salt = await bcrypt.genSalt(10)

    const passwordHash = await bcrypt.hash(password, salt)

    const user = await User.create({ name, email, passwordHash, role })

    const accessToken = generateAccessToken(user._id, user.role)

    return { user, accessToken }
}


const loginUser = async function (email, password)
{
    const user = await User.findOne({ email }).select('+passwordHash')

    if (!user)
    {
        throw new Error('Invalid email or password')
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)

    if (!isMatch)
    {
        throw new Error('Invalid email or password')
    }

    const accessToken = generateAccessToken(user._id, user.role)

    return { user, accessToken }
}

const forgotPassword = async function (email) {
    const user = await User.findOne({ email })
    if (!user) {
        throw new Error('User not found')
    }
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' })
    return resetToken
}

const resetPassword = async function (token, newPassword) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
        const user = await User.findById(decoded.id)
        if (!user) throw new Error('User not found')

        const salt = await bcrypt.genSalt(10)
        user.passwordHash = await bcrypt.hash(newPassword, salt)
        await user.save()
        
        return user
    } catch (err) {
        throw new Error('Invalid or expired password reset token')
    }
}


module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
}