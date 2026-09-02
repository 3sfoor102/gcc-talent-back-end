const Notification = require('../models/Notification');

const sendNotification = async ({ userId, type, title, body, link, data = {} }) => {
    try {
        if (!userId) return;
        await Notification.create({
            user: userId,
            type,
            title,
            body,
            link,
            data
        });
    } catch (err) {
        console.error("Failed to create notification:", err.message);
    }
};

module.exports = sendNotification;