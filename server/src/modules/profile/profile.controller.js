const profileService = require('./profile.service')


const createFreelancer = async function (req, res) 
{
    try {
        const userId = req.user.id

        const profileData = req.body

        const profile = await profileService.createFreelancerProfile(userId, profileData)

        res.status(201).json({
            success: true,
            data: {
                profile
            }
        })
    }
    catch (err) {
        res.status(400).json({
            success: false,
            error: { message: err.message }
        })
    }
}


const createClient = async function (req, res) 
{
    try {
        const userId = req.user.id

        const profileData = req.body

        const profile = await profileService.createClientProfile(userId, profileData)

        res.status(201).json({
            success: true,
            data: {
                profile
            }
        })
    }
    catch (err) {
        res.status(400).json({
            success: false,
            error: { message: err.message }
        })
    }
}


const getFreelancer = async function (req, res)
{
    try {
        const userId = req.user.id

        const profile = await profileService.getFreelancerProfile(userId)

        res.status(200).json({
            success: true,
            data: {
                profile
            }
        })
    }
    catch (err)
    {
        res.status(404).json({
            success: false,
            error: { message: err.message }
        })
    }
}



const updateFreelancer = async function (req, res)
{
    try {
        const userId = req.user.id

        const updateData = req.body

        const profile = await profileService.updateFreelancerProfile(userId, updateData)

        res.status(200).json({
            success: true,
            data: {
                profile
            }
        })
    }
    catch (err)
    {
        res.status(400).json({
            success: false,
            error: { message: err.message }
        })
    }
}

module.exports = {
    createFreelancer,
    createClient,
    getFreelancer,
    updateFreelancer
}