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

module.exports = {
    createReport,
}