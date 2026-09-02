const FreelancerProfile = require('../../models/FreelancerProfile')

const ClientProfile = require('../../models/ClientProfile')

const createFreelancerProfile = async function (userId, profileData) {
    const existingProfile = await FreelancerProfile.findOne({ user: userId })

    if (existingProfile) {
        throw new Error('Freelancer profile already exists')
    }

    const profile = await FreelancerProfile.create({ user: userId, ...profileData })

    return profile
}

const createClientProfile = async function (userId, profileData) {
    const existingProfile = await ClientProfile.findOne({ user: userId })

    if (existingProfile) {
        throw new Error('Client profile already exists')
    }

    const profile = await ClientProfile.create({ user: userId, ...profileData })

    return profile
}

const getFreelancerProfile = async function (userId) {
    let profile = await FreelancerProfile.findOne({ user: userId })

    if (!profile) {
        profile = await FreelancerProfile.create({ user: userId })
    }

    return profile
}

const updateFreelancerProfile = async function (userId, updateData) {
    const profile = await FreelancerProfile.findOneAndUpdate(
        { user: userId },
        { $set: updateData },
        { returnDocument: 'after', runValidators: true, upsert: true, setDefaultsOnInsert: true }
    )
    return profile
}

const getClientProfile = async function (userId) {
    let profile = await ClientProfile.findOne({ user: userId })

    if (!profile) {
        profile = await ClientProfile.create({ user: userId })
    }

    return profile
}

const updateClientProfile = async function (userId, updateData) {
    const profile = await ClientProfile.findOneAndUpdate(
        { user: userId },
        { $set: updateData },
        { returnDocument: 'after', runValidators: true, upsert: true, setDefaultsOnInsert: true }
    )

    return profile
}

const getPublicFreelancerProfile = async function (userId) {
    const profile = await FreelancerProfile.findOne({ user: userId })
        .populate('user', 'name avatarUrl country city ratingAvg ratingCount createdAt')

    if (!profile) {
        throw new Error('Freelancer profile not found')
    }

    return profile
}

const getPublicClientProfile = async function (userId) {
    const profile = await ClientProfile.findOne({ user: userId })
        .populate('user', 'name avatarUrl country city ratingAvg ratingCount createdAt')

    if (!profile) {
        throw new Error('Client profile not found')
    }

    return profile;
}


module.exports = {
    createFreelancerProfile,
    createClientProfile,
    getFreelancerProfile,
    updateFreelancerProfile,
    getClientProfile,
    updateClientProfile,
    getPublicFreelancerProfile,
    getPublicClientProfile
}