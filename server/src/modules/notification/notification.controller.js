const notificationService = require('./notification.service')

const getNotifications = async function (req, res, next)
{
    try {
        const userId = req.user.id

        const notifications = await notificationService.getUserNotifications(userId)

        res.status(200).json({
            success: true,
            data: {
                notifications
            }
        })
    }
    catch (err)
    {
        res.status(400)
        next(err)
    }
}


const markNotificationRead = async function (req, res, next)
{
    try {
        const userId = req.user.id

        const notificationId = req.params.id

        const notification = await notificationService.markAsRead(notificationId, userId)

        res.status(200).json({
            success: true,
            data: {
                notification
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
    getNotifications,
    markNotificationRead
}