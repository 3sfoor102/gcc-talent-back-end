const express = require('express')
const router = express.Router()

const adminCtrl = require('./admin.controller')
const verifyToken = require('../../middleware/verify-token')
const authorize = require('../../middleware/authorize')

router.use(verifyToken, authorize('admin'))

router.get('/users', adminCtrl.getAllUsers)
router.patch('/users/:id/status', adminCtrl.toggleUserStatus)

router.get('/categories', adminCtrl.getAllCategories)
router.post('/categories', adminCtrl.createCategory)
router.patch('/categories/:id', adminCtrl.updateCategory)
router.delete('/categories/:id', adminCtrl.deleteCategory)
router.get('/reports', adminCtrl.getAllReports)
router.patch('/reports/:id/status', adminCtrl.updateReportStatus)


module.exports = router