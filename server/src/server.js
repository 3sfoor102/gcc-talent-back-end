const dns = require("node:dns")
dns.setServers(["8.8.8.8", "1.1.1.1"])

const errorHandler = require('./middleware/errorHandler')
const verifyToken = require('./middleware/verify-token')
const authCtrl = require('./modules/auth/auth.controller')
const profileCtrl = require('./modules/profile/profile.controller')

require('dotenv').config()
const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')
const morgan = require('morgan')

const PORT = process.env.PORT ? process.env.PORT : "5000"

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

app.post('/auth/register', authCtrl.register)
app.post('/auth/login', authCtrl.login)
app.get('/auth/verify', verifyToken, authCtrl.verify)
app.post('/profile/freelancer', verifyToken, profileCtrl.createFreelancer)
app.post('/profile/client', verifyToken, profileCtrl.createClient)
app.get('/profile/freelancer', verifyToken, profileCtrl.getFreelancer)
app.put('/profile/freelancer', verifyToken, profileCtrl.updateFreelancer)
app.get('/profile/client', verifyToken, profileCtrl.getClient)
app.put('/profile/client', verifyToken, profileCtrl.updateClient)

app.use(errorHandler)

app.listen(PORT, function () {
    console.log(`The express app is ready on port ${PORT}! ✨✨✨`)
})