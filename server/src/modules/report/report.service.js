const Report = require('../../models/Report')

const createReport = async function (reporterId, reportData)
{
    const report = new Report(
    {
        reporter: reporterId,

        targetType: reportData.targetType,

        targetId: reportData.targetId,

        reason: reportData.reason
    })

    await report.save()
    
    return report
}


const getMyReports = async function (reporterId)
{
    const reports = await Report.find({ reporter: reporterId }).sort({ createdAt: -1 })
    
    return reports
}

module.exports = {
    createReport,
    getMyReports
}