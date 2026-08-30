const express = require('express')
const app = express()

app.use(express.json())

const contractRoutes = require('./modules/contracts/contracts.routes')
const userRoutes = require('./modules/users/users.routes')

app.use('/api/v1/contracts', contractRoutes)
app.use('/api/v1/users', userRoutes)