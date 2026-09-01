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

        const { key, value } = req.body

        const setting = await settingService.upsertSetting(key, value)

        res.status(200).json({
            success: true,
            data: {
                setting
            }
        })
    }
    catch (err)
    {
        res.status(400)
        next(err)
    }
}


const updateAvatar = async function (req, res, next) 
{
    try {

        if (!req.file) 
        {
            return res.status(400).json({ success: false, message: 'Please upload an image' })
        }

        const userId = req.user.id

        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                folder: "gcc_talent/avatars", 
                transformation: [{ width: 250, height: 250, crop: "fill" }]
            },
            async function (error, result){
                if (error) {
                    console.error("Cloudinary Upload Error:", error)
                    return res.status(500).json({ success: false, message: 'Failed to upload image' })
                }

                const user = await User.findById(userId)
                if (!user) {
                    return res.status(404).json({ success: false, message: 'User not found' })
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
            }
        )

        uploadStream.end(req.file.buffer)

    } catch (err) 
    {
        res.status(400)
        next(err)
    }
}


module.exports = {
    getSettings,
    updateSetting,
    updateAvatar
}