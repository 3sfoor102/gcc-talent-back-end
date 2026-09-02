const mongoose = require('mongoose')
const Job = require('../../models/Job')
const Category = require('../../models/Category')
const Skill = require('../../models/Skill')
const cloudinary = require('../../config/cloudinary')

const deleteFromCloudinary = async (attachments) => {
    if (!attachments || attachments.length === 0) {
        return;
    }

    for (const file of attachments) {
        if (file.public_id) {
            try {
                const res = await cloudinary.uploader.destroy(file.public_id);
                if (res.result === 'not found') {
                    await cloudinary.uploader.destroy(file.public_id, { resource_type: 'raw' });
                }
            } catch (err) {
                console.log("Could not delete from Cloudinary:", err.message);
            }
        }
    }
}

const indexJob = async (req, res) => {
    try {
        const queryValues = {
            q: req.query.q,
            category: req.query.category,
            skills: req.query.skills,
            budgetType: req.query.budgetType,
            minBudget: req.query.minBudget,
            maxBudget: req.query.maxBudget,
            experienceLevel: req.query.experienceLevel,
            page: req.query.page || 1,
            limit: req.query.limit || 12,
            sort: req.query.sort || '-createdAt',
        }

        const query = {
            status: 'open',
            isHidden: { $ne: true }
        }

        if (queryValues.q) {
            query.$text = { $search: queryValues.q }
        }
        if (queryValues.category) {
            if (mongoose.Types.ObjectId.isValid(queryValues.category)) {
                query.category = queryValues.category;
            } else {
                const foundCat = await Category.findOne({ name: queryValues.category }).select('_id');
                if (foundCat) query.category = foundCat._id;
            }
        }
        if (queryValues.budgetType) query.budgetType = queryValues.budgetType
        if (queryValues.experienceLevel) query.experienceLevel = queryValues.experienceLevel

        if (queryValues.skills) {
            const skillNames = queryValues.skills.split(',').map(skill => skill.trim());
            const matchedSkills = await Skill.find({ name: { $in: skillNames } }).select('_id');
            query.skills = { $in: matchedSkills.map(skill => skill._id) };
        }

        if (queryValues.minBudget || queryValues.maxBudget) {
            query.budgetMin = {}
            if (queryValues.minBudget) query.budgetMin.$gte = Number(queryValues.minBudget)
            if (queryValues.maxBudget) query.budgetMin.$lte = Number(queryValues.maxBudget)
        }

        const pageNum = parseInt(queryValues.page, 10);
        const limitNum = parseInt(queryValues.limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const [jobs, total] = await Promise.all([
            Job.find(query)
                .populate('client', 'name avatarUrl ratingAvg isCompany')
                .populate('category')
                .populate('skills')
                .sort(queryValues.sort)
                .skip(skip)
                .limit(limitNum),
            Job.countDocuments(query)
        ])

        return res.status(200).json({
            success: true,
            data: jobs,
            meta: {
                page: pageNum,
                limit: limitNum,
                total
            }
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        });
    }
}

const showJob = async (req, res) => {
    try {
        const userId = req.user ? (req.user._id || req.user.id || req.user.userId) : null

        const foundJob = await Job.findById(req.params.jobId)
            .populate('client', 'name avatarUrl ratingAvg isCompany')
            .populate('category')
            .populate('skills')

        if (!foundJob) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Job not found' }
            })
        }

        if ((foundJob.status === 'draft' || foundJob.isHidden) && (!userId || foundJob.client._id.toString() !== userId.toString())) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have permission to view this job.' }
            })
        }

        return res.status(200).json({
            success: true,
            data: foundJob
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const clientJobs = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;

        const page = parseInt(req.query.page, 10) || 1
        const limit = parseInt(req.query.limit, 10) || 12
        const skip = (page - 1) * limit

        const statusFilter = req.query.status ? { status: req.query.status } : {}
        const query = { client: userId, ...statusFilter }

        const [foundJobs, total] = await Promise.all([
            Job.find(query)
                .populate('category', 'name')
                .populate('skills', 'name')
                .skip(skip)
                .limit(limit)
                .sort('-createdAt'),
            Job.countDocuments(query)
        ])

        return res.status(200).json({
            success: true,
            data: foundJobs,
            meta: { page, limit, total }
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const createJob = async (req, res) => {
    try {

        const userId = req.user._id || req.user.id || req.user.userId;
        let selectedCategoryId = null
        if (req.body.category) {
            const selectedCategory = await Category.findOne({ name: req.body.category })
            selectedCategoryId = selectedCategory ? selectedCategory._id : null
        }

        let selectedSkillIds = null
        if (req.body.skills && req.body.skills.length > 0) {
            const selectedSkills = await Skill.find({ name: { $in: req.body.skills } })
            selectedSkillIds = selectedSkills.map(skill => skill._id)
        }


        const toUpload = {
            client: userId,
            title: req.body.title,
            description: req.body.description,
            category: selectedCategoryId,
            skills: selectedSkillIds || [],
            budgetType: req.body.budgetType,
            budgetMin: req.body.budgetMin,
            budgetMax: req.body.budgetMax,
            experienceLevel: req.body.experienceLevel,
            duration: req.body.duration,
            deadline: req.body.deadline,
            attachments: req.body.attachments || [],
            status: req.body.status || 'open'
        }

        const newJob = await Job.create(toUpload)

        return res.status(201).json({
            success: true,
            data: newJob
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const updateJob = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Job not found' }
            })
        }


        if (!foundJob.client.equals(userId)) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only the owner can edit this Job!' }
            })
        }

        if (foundJob.status !== 'open' && foundJob.status !== 'draft') {
            return res.status(422).json({
                success: false,
                error: { code: 'INVALID_STATE', message: `Cannot edit this job due to it being ${foundJob.status}` }
            })
        }

        if (req.body.attachments) {
            const filesToDelete = foundJob.attachments.filter((oldFile) => {
                const stillExists = req.body.attachments.some(
                    (newFile) => newFile.public_id === oldFile.public_id
                );
                return !stillExists;
            });

            await deleteFromCloudinary(filesToDelete);
        }

        let categoryId = foundJob.category
        if (req.body.category) {
            const selectedCategory = await Category.findOne({ name: req.body.category })
            if (selectedCategory) categoryId = selectedCategory._id
        }

        let skillIds = foundJob.skills
        if (req.body.skills) {
            const selectedSkills = await Skill.find({ name: { $in: req.body.skills } })
            skillIds = selectedSkills.map(skill => skill._id)
        }

        const updates = {
            title: req.body.title ?? foundJob.title,
            description: req.body.description ?? foundJob.description,
            category: categoryId,
            skills: skillIds,
            budgetType: req.body.budgetType ?? foundJob.budgetType,
            budgetMin: req.body.budgetMin ?? foundJob.budgetMin,
            budgetMax: req.body.budgetMax ?? foundJob.budgetMax,
            experienceLevel: req.body.experienceLevel ?? foundJob.experienceLevel,
            duration: req.body.duration ?? foundJob.duration,
            deadline: req.body.deadline ?? foundJob.deadline,
            status: req.body.status ?? foundJob.status,
            attachments: req.body.attachments ?? foundJob.attachments
        }


        const updatedJob = await Job.findByIdAndUpdate(
            req.params.jobId,
            updates,
            { new: true, runValidators: true }
        )

        return res.status(200).json({
            success: true,
            data: updatedJob
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const deleteJob = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Job not found' }
            })
        }

        if (!foundJob.client.equals(userId)) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only the owner can delete this Job!' }
            })
        }

        if (foundJob.status !== 'draft') {
            return res.status(422).json({
                success: false,
                error: { code: 'INVALID_STATE', message: `Cannot delete this job due to it being ${foundJob.status}` }
            })
        }

        await deleteFromCloudinary(foundJob.attachments);

        const deletedJob = await Job.findByIdAndDelete(req.params.jobId)

        return res.status(200).json({
            success: true,
            data: deletedJob
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const changeStatus = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Job not found' }
            })
        }


        if (!foundJob.client.equals(userId)) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only the owner can change the status for this Job!' }
            })
        }

        const updateStatus = { status: req.body.status }

        const updatedJob = await Job.findByIdAndUpdate(req.params.jobId, updateStatus, { new: true })

        return res.status(200).json({
            success: true,
            data: updatedJob
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({}).sort('name')
        return res.status(200).json({
            success: true,
            data: categories
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const getSkills = async (req, res) => {
    try {
        const query = req.query.category ? { category: req.query.category } : {}
        const skills = await Skill.find(query).sort('name')
        return res.status(200).json({
            success: true,
            data: skills
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

module.exports = {
    indexJob,
    showJob,
    clientJobs,
    createJob,
    updateJob,
    deleteJob,
    changeStatus,
    getCategories,
    getSkills
}