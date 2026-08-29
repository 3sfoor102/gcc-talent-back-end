const settingService = require('./setting.service')


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


module.exports = {
    getSettings,
    updateSetting
}