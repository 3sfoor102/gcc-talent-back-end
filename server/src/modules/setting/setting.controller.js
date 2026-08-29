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


module.exports = {
    getSettings,
}