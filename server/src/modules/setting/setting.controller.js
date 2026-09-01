const settingService = require('./setting.service')
const User = require('../../models/User')
const cloudinary = require('../../config/cloudinary')


const getSettings = async function (req, res, next)
{
    try {

        const settings = await settingService.getAllSettings()

        res.status(200).json({
            success: true,
            data: {
                settings
            }
        })
    }
    catch (err)
    {
        res.status(400)
        next(err)
    }
}


const updateSetting = async function (req, res, next)
{
    try {
        const userId = req.user.id || req.user._id
        const { name, email, currentPassword, newPassword, avatarUrl } = req.body

        const user = await User.findById(userId).select('+passwordHash')
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        if (name) user.name = name
        if (email) user.email = email
        if (avatarUrl) user.avatarUrl = avatarUrl

        if (newPassword) {
            if (!currentPassword) 
            {
                return res.status(400).json({ success: false, message: 'Current password is required to set a new password' })
            }
            const bcrypt = require('bcrypt')
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect' })
            }
            const salt = await bcrypt.genSalt(10)
            user.passwordHash = await bcrypt.hash(newPassword, salt)
        }

        await user.save()

        const updatedUser = await User.findById(userId)

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully!',
            data: {
                user: {
                    _id: updatedUser._id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    avatarUrl: updatedUser.avatarUrl
                }
            }
        })
    }
    catch (err)
    {
        res.status(400)
        next(err)
    }
}


const updateAvatar = async function (req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file received from the form.' })
        }

        const userId = req.user.id || req.user._id

        const result = await new Promise(function (resolve, reject)
        {
            const uploadStream = cloudinary.uploader.upload_stream(
                { 
                    folder: "gcc_talent/avatars", 
                    transformation: [{ width: 250, height: 250, crop: "fill" }] 
                },
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                }
            )
            uploadStream.end(req.file.buffer)
        })

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found in database.' })
        }

        user.avatarUrl = result.secure_url
        await user.save()

        return res.status(200).json({
            success: true,
            message: 'Avatar updated successfully',
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatarUrl: user.avatarUrl
                }
            }
        })

    } catch (err) 
    {
        console.error("Avatar Upload Crash:", err)
        return res.status(400).json({ 
            success: false, 
            message: err.message || 'Failed to process image upload.' 
        })
    }
}


module.exports = {
    getSettings,
    updateSetting,
    updateAvatar
}