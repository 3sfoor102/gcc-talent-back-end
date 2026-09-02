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

const searchFreelancers = async function (filters = {}) {
    const { q, skills, minRate, maxRate, availability, page = 1, limit = 12 } = filters
    const pageNum = parseInt(page, 10) || 1
    const limitNum = parseInt(limit, 10) || 12
    const skip = (pageNum - 1) * limitNum

    const query = {}

    if (availability) {
        query.availability = availability
    }

    if (minRate || maxRate) {
        query.hourlyRate = {}
        if (minRate) query.hourlyRate.$gte = Number(minRate)
        if (maxRate) query.hourlyRate.$lte = Number(maxRate)
    }

    if (skills) {
        const skillList = skills.split(',').map((s) => new RegExp(s.trim(), 'i'))
        query.skills = { $in: skillList }
    }

    if (q) {
        query.$or = [
            { headline: { $regex: q, $options: 'i' } },
            { bio: { $regex: q, $options: 'i' } }
        ]
    }

    const [profiles, total] = await Promise.all([
        FreelancerProfile.find(query)
            .populate('user', 'name avatarUrl ratingAvg ratingCount city country')
            .skip(skip)
            .limit(limitNum)
            .sort('-completedContracts -createdAt'),
        FreelancerProfile.countDocuments(query)
    ])

    return { profiles, total, page: pageNum, limit: limitNum }
}


module.exports = {
    createFreelancerProfile,
    createClientProfile,
    getFreelancerProfile,
    updateFreelancerProfile,
    getClientProfile,
    updateClientProfile,
    getPublicFreelancerProfile,
    getPublicClientProfile,
    searchFreelancers
}