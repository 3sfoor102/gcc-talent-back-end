const authService = require('./auth.service')

const register = async function (req, res)
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
        res.status(400).json({
            success: false,
            error: { message: err.message }
        })
    }
}


const login = async function (req, res)
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
        res.status(401).json(
        {
            success: false,
            error: { message: err.message }
        })
    }
}

const verify = async function (req, res)
{
    try {
        res.status(200).json({
            success: true,
            data: {
                user: req.user 
            }
        })
    }
    catch (err)
    {
        res.status(401).json({
            success: false,
            error: { message: err.message }
        })
    }
}

module.exports = {
    register,
    login,
    verify
}