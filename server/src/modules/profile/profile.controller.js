const profileService = require('./profile.service')

const createFreelancer = async function (req, res, next) {
    try {
        const userId = req.user?._id || req.user?.id || req.user?.userId
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
        res.status(400)
        next(err)
    }
}

const createClient = async function (req, res, next) {
    try {
        const userId = req.user?._id || req.user?.id || req.user?.userId
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
        res.status(400)
        next(err)
    }
}

const getFreelancer = async function (req, res, next) {
    try {
        const userId = req.user?._id || req.user?.id || req.user?.userId
        const profile = await profileService.getFreelancerProfile(userId)

        res.status(200).json({
            success: true,
            data: {
                profile
            }
        })
    }
    catch (err) {
        res.status(404)
        next(err)
    }
}

const updateFreelancer = async function (req, res, next) {
    try {
        const userId = req.user?._id || req.user?.id || req.user?.userId
        const updateData = req.body

        const profile = await profileService.updateFreelancerProfile(userId, updateData)

        res.status(200).json({
            success: true,
            data: {
                profile
            }
        })
    }
    catch (err) {
        res.status(400)
        next(err)
    }
}

const getClient = async function (req, res, next) {
    try {
        const userId = req.user?._id || req.user?.id || req.user?.userId
        const profile = await profileService.getClientProfile(userId)

        res.status(200).json({
            success: true,
            data: {
                profile
            }
        })
    }
    catch (err) {
        res.status(404)
        next(err)
    }
}

const updateClient = async function (req, res, next) {
    try {
        const userId = req.user?._id || req.user?.id || req.user?.userId
        const updateData = req.body

        const profile = await profileService.updateClientProfile(userId, updateData)

        res.status(200).json({
            success: true,
            data: {
                profile
            }
        })
    }
    catch (err) {
        res.status(400)
        next(err)
    }
}

const getPublicFreelancer = async function (req, res, next) {
    try {
        const profile = await profileService.getPublicFreelancerProfile(req.params.userId)
        res.status(200).json({
            success: true,
            data: { profile }
        })
    } catch (err) {
        res.status(404)
        next(err)
    }
}

const getPublicClient = async function (req, res, next) {
    try {
        const profile = await profileService.getPublicClientProfile(req.params.userId)
        res.status(200).json({
            success: true,
            data: { profile }
        })
    } catch (err) {
        res.status(404)
        next(err)
    }
}

module.exports = {
    createFreelancer,
    createClient,
    getFreelancer,
    updateFreelancer,
    getClient,
    updateClient,
    getPublicFreelancer,
    getPublicClient
}