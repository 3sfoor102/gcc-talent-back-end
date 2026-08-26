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








module.exports = {
    register,
}