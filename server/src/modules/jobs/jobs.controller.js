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

        const foundJobs = await Job.find({ client: req.user._id })

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

        selectedCategory = await Category.find({ name: req.body.category })

        if (req.body.category) {
            selectedSkill = await Skill.find({ name: req.body.category })
        }

        toUpload = {
            client: req.user._id,
            title: req.body.title,
            description: req.body.description,
            category: selectedCategory._id,
            skills: selectedSkill._id,
            budgetType: req.body.budgetType,
            budgetMin: req.body.budgetMin,
            budgetMax: req.body.budgetMax,
            experienceLevel: req.body.experienceLevel,
            duration: req.body.duration,
            deadline: req.body.deadline,
            // Attachment here!
            status: req.body.status
        }

        const newJob = await Job.create(toUpload)

        req.status(201).json(newJob)


    } catch (err) {
        res.status(500).json({ err: err.message });

    }
}

const updateJob = async (req, res) => {
    try {
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob) {
            return res.status(404).json({ err: "Job not found" });
        }


        if (!foundJob.client.equals(req.user._id)) {
            return res.status(403).send("Only the owner can edit this Job!");
        }


        const updatedJob = await Job.findByIdAndUpdate(req.params.jobId, req.body, { returnDocument: 'after' })


        res.status(200).json(updateJob)


    } catch (err) {
        res.status(500).json({ err: err.message });

    }
}

const deleteJob = async (req, res) => {
    try {
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob) {
            return res.status(404).json({ err: "Job not found" });
        }

        if (!foundJob.client.equals(req.user._id)) {
            return res.status(403).send("Only the owner can edit this Job!");
        }

        const deletedJob = await Job.findByIdAndDelete(req.params.jobId)
        res.status(200).json(deleteJob);

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
}

const changeStatus = async (req, res) => {
    try {
        const foundJob = await Job.findById(req.params.jobId)

        if (!foundJob) {
            return res.status(404).json({ err: "Job not found" });
        }


        if (!foundJob.client.equals(req.user._id)) {
            return res.status(403).send("Only the owner can edit this Job!");
        }

        const updateStatus = { status: req.body.status }

        const updatedJob = await Job.findByIdAndUpdate(req.params.jobId, updateStatus , { returnDocument: 'after' })


        res.status(200).json(updateJob)


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