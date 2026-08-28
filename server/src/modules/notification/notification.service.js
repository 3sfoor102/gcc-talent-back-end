const Notification = require('../../models/Notification')

const getUserNotifications = async function (userId)
{
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 })
    
    return notifications
}


module.exports = {
    getUserNotifications,
}