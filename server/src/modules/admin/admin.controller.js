const User = require('../../models/User')
const Category = require('../../models/Category')
const Report = require('../../models/Report')

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

const getAllCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({}).sort('-createdAt')
        res.status(200).json({ success: true, data: categories })
    } catch (error) {
        next(error)
    }
}

const createCategory = async (req, res, next) => {
    try {
        const { name, isFeatured } = req.body;
        
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const newCategory = await Category.create({ name, slug, isFeatured });
        res.status(201).json({ success: true, data: newCategory });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: { message: 'Category name already exists' } });
        }
        next(error);
    }
}

const updateCategory = async (req, res, next) => {
    try {
        const { name, isFeatured } = req.body;
        let updates = { isFeatured };
        
        if (name) {
            updates.name = name;
            updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }

        const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        
        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, data: updatedCategory });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: { message: 'Category name already exists' } });
        }
        next(error);
    }
}

const deleteCategory = async (req, res, next) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        next(error);
    }
}

const getAllReports = async (req, res, next) => {
    try {
        const reports = await Report.find({})
            .populate('reporter', 'name email avatarUrl')
            .sort('-createdAt')
            
        res.status(200).json({ success: true, data: reports })
    } catch (error) {
        next(error)
    }
}

const updateReportStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const report = await Report.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).populate('reporter', 'name email avatarUrl');

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getAllUsers,
    toggleUserStatus,
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getAllReports,
    updateReportStatus 
}