const express = require('express')
const app = express();

app.use(express.json())

const messageRoutes = require('./modules/messages/messages.routes')

app.use('/api/v1/conversations', messageRoutes)