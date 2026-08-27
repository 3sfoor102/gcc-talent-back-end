const FreelancerProfile = require('../../models/FreelancerProfile')

const ClientProfile = require('../../models/ClientProfile')


const createFreelancerProfile = async function (userId, profileData) 
{

    const existingProfile = await FreelancerProfile.findOne({ user: userId })

    if (existingProfile) 
    {
        throw new Error('Freelancer profile already exists')
    }

    const profile = await FreelancerProfile.create({ user: userId, ...profileData })

    return profile
}



const createClientProfile = async function (userId, profileData) 
{
    const existingProfile = await ClientProfile.findOne({ user: userId })

    if (existingProfile) 
    {
        throw new Error('Client profile already exists')
    }

    const profile = await ClientProfile.create({ user: userId, ...profileData })

    return profile
}

module.exports = {
    createFreelancerProfile,
    createClientProfile
}