const reportService = require('./report.service')

const submitReport = async function (req, res, next)
{
    try {

        const userId = req.user.id

        const reportData = req.body

        const report = await reportService.createReport(userId, reportData)

        res.status(201).json({
            success: true,
            data: {
                report
            }
        })
    }
    catch (err)
    {
        res.status(400)
        next(err)
    }
}


const getReports = async function (req, res, next)
{
    try {

        const userId = req.user.id

        const reports = await reportService.getMyReports(userId)

        res.status(200).json({
            success: true,
            data: {
                reports
            }
        })
    }
    catch (err)
    {
        res.status(400)
        next(err)
    }
}



module.exports = {
    submitReport,
    getReports
}