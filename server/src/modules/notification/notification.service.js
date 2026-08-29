const Notification = require('../../models/Notification')

const getUserNotifications = async function (userId)
{
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 })
    
    return notifications
}

const markAsRead = async function (notificationId, userId)
{
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { isRead: true },
        { new: true }
    )

    if (!notification)
    {
        throw new Error('Notification not found')
    }

    return notification
}

module.exports = {
    getUserNotifications,
    markAsRead
}