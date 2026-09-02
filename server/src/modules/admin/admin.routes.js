const express = require('express')
const router = express.Router()

const adminCtrl = require('./admin.controller')
const verifyToken = require('../../middleware/verify-token')
const authorize = require('../../middleware/authorize')

router.use(verifyToken, authorize('admin'))

router.get('/users', adminCtrl.getAllUsers)

module.exports = router