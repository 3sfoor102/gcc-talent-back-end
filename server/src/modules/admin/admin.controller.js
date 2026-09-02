const User = require('../../models/User')

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).sort('-createdAt')
        res.status(200).json({ success: true, data: users })
    } catch (error) {
        next(error)
    }
}

const toggleUserStatus = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const currentUserId = req.user._id || req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user._id.toString() === currentUserId.toString()) {
            return res.status(400).json({ success: false, error: { message: 'You cannot suspend your own admin account!' } });
        }

        user.status = user.status === 'active' ? 'suspended' : 'active';
        await user.save();

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getAllUsers,
    toggleUserStatus
}