const dns = require("node:dns")
dns.setServers(["8.8.8.8", "1.1.1.1"])



require('dotenv').config()
const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')
const morgan = require('morgan')

const PORT = process.env.PORT ? process.env.PORT : "5000"







mongoose.connect(process.env.MONGODB_URI)

mongoose.connection.on('connected', function ()
{
    console.log(`Connected to MongoDB ${mongoose.connection.name}. ✔️✔️✔️`)
})

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))








app.listen(PORT, function ()
{
    console.log(`The express app is ready on port ${PORT}! ✨✨✨`)
})