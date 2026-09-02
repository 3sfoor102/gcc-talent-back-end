const nodemailer = require('nodemailer')

const sendResetEmail = async (toEmail, resetUrl) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })

    const mailOptions = {
        from: `"GCC Talent" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Password Reset Request - GCC Talent',
        html: `
            <div style="font-family: Arial, sans-serif; max-w-md; margin: auto; padding: 20px; text-align: center; border: 1px solid #EFE4D8; border-radius: 10px; background-color: #F7F0E9;">
                <h2 style="color: #1F2A2B;">Reset Your Password</h2>
                <p style="color: #2E5A5E; font-size: 16px;">You requested to reset your password. Click the button below to choose a new one:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #224548; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                <p style="color: #666; font-size: 12px;">This link is valid for 15 minutes. If you didn't request this, please ignore this email.</p>
            </div>
        `
    }

    await transporter.sendMail(mailOptions)
}

module.exports = {
    sendResetEmail
}