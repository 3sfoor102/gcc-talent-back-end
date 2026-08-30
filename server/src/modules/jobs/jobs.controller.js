const Job = require('../../models/Job')
const Category = require('../../models/Category')
const Skill = require('../../models/Skill')

const indexJob = async (req, res) => {
    try {
        const jobs = await Job.find()

        res.status(200).json(jobs)

    } catch (err) {
        res.status(500).json({ err: err.message });

    }
}

const showJob = async (req, res) => {
    try {

        const foundjob = await Job.findById(req.params.jobId)

        if (!foundjob) {
            return res.status(404).json({ err: "Job not found" });
        }
        res.status(200).json(foundjob);

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const clientJobs = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;

        const foundJobs = await Job.find({ client: userId })

        if (!foundJobs) {
            return res.status(404).json({ err: "No jobs were found" });
        }


        res.status(200).json(foundJobs);

    } catch (err) {
        res.status(500).json({ err: err.message });
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

        let selectedSkillId = null
        if (req.body.skills) {
            const selectedSkill = await Skill.findOne({ name: req.body.skills })
            selectedSkillId = selectedSkill ? selectedSkill._id : null
        }
        const toUpload = {
            client: userId,
            title: req.body.title,
            description: req.body.description,
            category: selectedCategoryId,
            skills: selectedSkillId ? [selectedSkillId] : [],
            budgetType: req.body.budgetType,
            budgetMin: req.body.budgetMin,
            budgetMax: req.body.budgetMax,
            experienceLevel: req.body.experienceLevel,
            duration: req.body.duration,
            deadline: req.body.deadline,
            status: req.body.status || 'open'
        }

        const newJob = await Job.create(toUpload)

        return res.status(201).json(newJob);

    } catch (err) {
        res.status(500).json({ err: err.message });

    }
}

const updateJob = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob) {
            return res.status(404).json({ err: "Job not found" });
        }


        if (!foundJob.client.equals(userId)) {
            return res.status(403).send("Only the owner can edit this Job!");
        }

        if (foundJob.status !== 'open' && foundJob.status !== 'draft') {
            return res.status(400).json({ err: `Cannot edit this job, due to it being ${foundJob.status}` })
        }

        const updatedJob = await Job.findByIdAndUpdate(req.params.jobId, req.body, { returnDocument: 'after' })


        return res.status(200).json(updatedJob)


    } catch (err) {
        res.status(500).json({ err: err.message });

    }
}

const deleteJob = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob) {
            return res.status(404).json({ err: "Job not found" });
        }

        if (!foundJob.client.equals(userId)) {
            return res.status(403).send("Only the owner can edit this Job!");
        }

        if (foundJob.status !== 'draft') {
            return res.status(400).json({ err: `Cannot edit this job, due to it being ${foundJob.status}` })
        }

        const deletedJob = await Job.findByIdAndDelete(req.params.jobId)
        return res.status(200).json(deletedJob);

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const changeStatus = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob) {
            return res.status(404).json({ err: "Job not found" });
        }


        if (!foundJob.client.equals(userId)) {
            return res.status(403).send("Only the owner can edit this Job!");
        }

        const updateStatus = { status: req.body.status }

        const updatedJob = await Job.findByIdAndUpdate(req.params.jobId, updateStatus, { returnDocument: 'after' })


        return res.status(200).json(updatedJob)


    } catch (err) {
        res.status(500).json({ err: err.message });

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
}