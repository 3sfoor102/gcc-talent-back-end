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

const socialLogin = async function (req, res, next) {
    try {
        const { user, accessToken } = await authService.socialLogin(req.body);

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
        });
    } catch (err) {
        res.status(400);
        next(err);
    }
};

const linkedinLogin = async function (req, res, next) {
    try {
        const { code } = req.body;
        const redirectUri = 'https://ga-gcc-talent.vercel.app/linkedin';

        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                redirect_uri: redirectUri
            })
        });
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            return res.status(400).json({ success: false, error: { message: tokenData.error_description } });
        }

        const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userData = await userResponse.json();

        const socialData = {
            name: userData.name,
            email: userData.email,
            avatarUrl: userData.picture,
            provider: 'linkedin'
        };

        const authService = require('./auth.service');
        const { user, accessToken } = await authService.socialLogin(socialData);

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
        });
    } catch (err) {
        res.status(400);
        next(err);
    }
};

module.exports = {
    register,
    login,
    verify,
    forgotPassword,
    resetPassword,
    socialLogin,
    linkedinLogin

}