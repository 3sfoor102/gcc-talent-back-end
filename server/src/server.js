const dns = require("node:dns")
dns.setServers(["8.8.8.8", "1.1.1.1"])

const errorHandler = require('./middleware/errorHandler')
const verifyToken = require('./middleware/verify-token')
const authCtrl = require('./modules/auth/auth.controller')
const profileCtrl = require('./modules/profile/profile.controller')
const notificationCtrl = require('./modules/notification/notification.controller')
const reportCtrl = require('./modules/report/report.controller')
const settingCtrl = require('./modules/setting/setting.controller')
const upload = require('./config/multer')

const walletRouter = require('./modules/wallet/wallet.routes.js');
const contractRouter = require('./modules/contracts/contracts.routes.js')
const jobRoutes = require('./modules/jobs/jobs.routes')
const userRoutes = require('./modules/users/users.routes')
const messageRoutes = require('./modules/messages/messages.routes')
const proposalsRouter = require('./modules/proposals/proposals.routes.js')


require('dotenv').config()
const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')
const morgan = require('morgan')

const PORT = process.env.PORT ? process.env.PORT : "3000"

mongoose.connect(process.env.MONGODB_URI)

mongoose.connection.on('connected', function () {
    console.log(`Connected to MongoDB ${mongoose.connection.name}. ✔️✔️✔️`)
})

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))


app.get('/', function (req, res) {
    res.send('GCC Talent API is running!')
})

// Ali Saleh's Routes
// **Authentication Routes:
app.post('/api/v1/auth/register', authCtrl.register)
app.post('/api/v1/auth/login', authCtrl.login)
app.get('/api/v1/auth/verify', verifyToken, authCtrl.verify)
app.post('/api/v1/auth/forgot-password', authCtrl.forgotPassword)
app.post('/api/v1/auth/reset-password', authCtrl.resetPassword)
app.get('/api/v1/settings', verifyToken, settingCtrl.getSettings)
app.put('/api/v1/settings', verifyToken, settingCtrl.updateSetting)
app.put('/api/v1/settings/avatar', verifyToken, upload.single('avatar'), settingCtrl.updateAvatar)
app.get('/api/v1/settings', verifyToken, settingCtrl.getSettings)
app.put('/api/v1/settings', verifyToken, settingCtrl.updateSetting)
app.put('/api/v1/settings/avatar', verifyToken, upload.single('avatar'), settingCtrl.updateAvatar)
app.use('/api/v1/dashboard', require('./modules/dashboard/dashboard.routes'))
app.use('/api/v1/admin', require('./modules/admin/admin.routes'))

// **Profile Routes:
// Talent Search & Browse
app.get('/api/v1/profile/freelancers', profileCtrl.listFreelancers)
// Freelancer Profile Management (Current User)
app.post('/api/v1/profile/freelancer', verifyToken, profileCtrl.createFreelancer)
app.get('/api/v1/profile/freelancer', verifyToken, profileCtrl.getFreelancer)
app.put('/api/v1/profile/freelancer', verifyToken, profileCtrl.updateFreelancer)
// Client Profile Management (Current User)
app.post('/api/v1/profile/client', verifyToken, profileCtrl.createClient)
app.get('/api/v1/profile/client', verifyToken, profileCtrl.getClient)
app.put('/api/v1/profile/client', verifyToken, profileCtrl.updateClient)
// Public Profile Views (Lookup by userId)
app.get('/api/v1/profile/freelancer/:userId', profileCtrl.getPublicFreelancer)
app.get('/api/v1/profile/client/:userId', profileCtrl.getPublicClient)

// **Notification Routes:
app.get('/api/v1/notifications', verifyToken, notificationCtrl.getNotifications)
app.put('/api/v1/notifications/:id/read', verifyToken, notificationCtrl.markNotificationRead)

// **Report & Dispute Routes:
app.post('/api/v1/reports', verifyToken, reportCtrl.submitReport)
app.get('/api/v1/reports', verifyToken, reportCtrl.getReports)

// **User Settings & Account Routes:
app.get('/api/v1/settings', verifyToken, settingCtrl.getSettings)
app.put('/api/v1/settings', verifyToken, settingCtrl.updateSetting)
app.put('/api/v1/settings/avatar', verifyToken, upload.single('avatar'), settingCtrl.updateAvatar)





// Alasfoor Routes
app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/contracts', contractRouter);








// Hasan's Routes
app.use('/api/v1/jobs', jobRoutes)
app.use('/api/v1/proposals', proposalsRouter)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/conversations', messageRoutes)









app.use(errorHandler)

app.listen(PORT, function () {
    console.log(`The express app is ready on port ${PORT}! ✨✨✨`)
})

