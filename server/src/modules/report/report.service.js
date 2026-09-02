const Report = require('../../models/Report');
const sendNotification = require('../../utils/sendNotification');
const User = require('../../models/User');

const createReport = async function (reporterId, reportData) {
    const report = new Report({
        reporter: reporterId,
        targetType: reportData.targetType,
        targetId: reportData.targetId,
        reason: reportData.reason
    });
    await report.save();

    await sendNotification({
        userId: reporterId,
        type: 'report_submitted',
        title: 'Report Received',
        body: 'Your report has been submitted successfully. Our admin team will review it.',
        link: '/admin/reports'
    });

    return report;
};


const getMyReports = async function (reporterId)
{
    const reports = await Report.find({ reporter: reporterId }).sort({ createdAt: -1 })
    
    return reports
}

module.exports = {
    createReport,
    getMyReports
}