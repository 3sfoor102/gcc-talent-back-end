const jwt = require('jsonwebtoken')

const bcrypt = require('bcrypt')

const User = require('../../models/User')
const FreelancerProfile = require('../../models/FreelancerProfile')
const ClientProfile = require('../../models/ClientProfile')

const generateAccessToken = function (id, role) {
    return jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES })
}


const registerUser = async function (userData) {
    const { name, email, password, role } = userData

    const userExists = await User.findOne({ email })

    if (userExists) {
        throw new Error('Email is already registered')
    }

    const salt = await bcrypt.genSalt(10)

    const passwordHash = await bcrypt.hash(password, salt)

    const user = await User.create({ name, email, passwordHash, role })

    if (user.role === 'freelancer') {
        await FreelancerProfile.create({ user: user._id })
    } else if (user.role === 'client') {
        await ClientProfile.create({ user: user._id })
    }

    const accessToken = generateAccessToken(user._id, user.role)

    return { user, accessToken }
}


const loginUser = async function (email, password) {
    const user = await User.findOne({ email }).select('+passwordHash')

    if (!user) {
        throw new Error('Invalid email or password')
    }

    if (user.status === 'suspended') {
        throw new Error('Your account has been suspended by the administrator.')
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)

    if (!isMatch) {
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

const socialLogin = async function (socialData) {
    const { name, email, avatarUrl } = socialData
    if (!email) {
        throw new Error('Email is required from social provider')
    }

    let user = await User.findOne({ email })
    if (!user) {
        const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(generatedPassword, salt)
        
        user = await User.create({
            name: name || 'User',
            email,
            passwordHash,
            role: 'freelancer',
            avatarUrl: avatarUrl || '',
            isEmailVerified: true
        })

        if (user.role === 'freelancer') {
            await FreelancerProfile.create({ user: user._id })
        }
    }

    if (user.status === 'suspended') {
        throw new Error('Your account has been suspended by the administrator.')
    }

    const accessToken = generateAccessToken(user._id, user.role)

    return { user, accessToken }
}


module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    socialLogin
}