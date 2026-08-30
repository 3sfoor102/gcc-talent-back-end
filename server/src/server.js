const express = require('express')
const app = express()

app.use(express.json())

const contractRoutes = require('./modules/contracts/contracts.routes')

app.use('/api/v1/contracts', contractRoutes)

module.exports = app