const Setting = require('../../models/Setting')

const getAllSettings = async function ()
{
    const settings = await Setting.find({})
    
    return settings
}

const upsertSetting = async function (key, value)
{
    const setting = await Setting.findOneAndUpdate(
        { key: key },
        { value: value },
        { new: true, upsert: true } 
    )

    return setting
}


module.exports = {
    getAllSettings,
}