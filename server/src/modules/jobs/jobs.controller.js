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

const updateJob = async (req, res) => { }

const deleteJob = async (req, res) => { }


module.exports = {
    indexJob,
    createJob,
    updateJob,
    deleteJob
}