const Job = require('../../models/Job')



const indexJob = async (req, res) => {
    try {
        const jobs = await Job.find()

        res.status(200).json(jobs)

    } catch (err) {
        res.status(500).json({ err: err.message });

    }
}
const createJob = async (req, res) => { }
const updateJob = async (req, res) => { }
const deleteJob = async (req, res) => { }


module.exports = {
    indexJob,
    createJob,
    updateJob,
    deleteJob
}