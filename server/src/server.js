const express = require('express')
const app = express()

app.use(express.json())

const jobRoutes = require('./modules/jobs/jobs.routes')

app.use('/api/v1/jobs', jobRoutes)