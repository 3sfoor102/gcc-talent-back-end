const express = require('express')
const router = express.Router()

const dashboardCtrl = require('./dashboard.controller')
const verifyToken = require('../../middleware/verify-token')

router.use(verifyToken)

router.get('/stats', dashboardCtrl.getStats)

module.exports = router