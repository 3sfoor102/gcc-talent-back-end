const authService = require('./auth.service')
const User = require('../../models/User')
const { sendResetEmail } = require('../../utils/mailer')

const register = async function (req, res, next)
{
    try {
        const { name, email, password, role } = req.body

        const { user, accessToken } = await authService.registerUser({ name, email, password, role })

        res.status(201).json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                accessToken
            }
        })
    } catch (err)
    {
        res.status(400)
        next(err)
    }
}

const login = async function (req, res, next)
{
    try {
        const { email, password } = req.body

        const { user, accessToken } = await authService.loginUser(email, password)

        res.status(200).json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatarUrl: user.avatarUrl
                },
                accessToken
            }
        })
    }
    catch (err)
    {
        res.status(401)
        next(err)
    }
}

const verify = async function (req, res, next)
{
    try {
        const foundUser = await User.findById(req.user.id || req.user._id)

        if (!foundUser) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        if (foundUser.status === 'suspended') {
            return res.status(403).json({ success: false, message: 'Your account has been suspended.' })
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    _id: foundUser._id,
                    name: foundUser.name,
                    email: foundUser.email,
                    role: foundUser.role,
                    avatarUrl: foundUser.avatarUrl,
                    status: foundUser.status
                }
            }
        })
    }
    catch (err)
    {
        res.status(401)
        next(err)
    }
}

const forgotPassword = async function (req, res, next) {
    try {
        const { email } = req.body
        const resetToken = await authService.forgotPassword(email)

        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`

        await sendResetEmail(email, resetUrl)

        res.status(200).json({
            success: true,
            message: 'Password reset link sent to your email successfully!'
        })
    } catch (err) {
        res.status(400)
        next(err)
    }
}

const resetPassword = async function (req, res, next) {
    try {
        const { token, newPassword } = req.body
        await authService.resetPassword(token, newPassword)

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now login.'
        })
    } catch (err) {
        res.status(400)
        next(err)
    }
}

module.exports = {
    register,
    login,
    verify,
    forgotPassword,
    resetPassword,

}