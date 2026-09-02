const express = require('express');
const router = express.Router();

const adminCtrl = require('./admin.controller');
const verifyToken = require('../../middleware/verify-token');
const authorize = require('../../middleware/authorize');

// Enforce authentication and admin role across all routes in this module
router.use(verifyToken, authorize('admin'));

// User Management (F-ADM-02)
router.get('/users', adminCtrl.getAllUsers);
router.patch('/users/:id/status', adminCtrl.toggleUserStatus);

// Category Management (F-ADM-03)
router.get('/categories', adminCtrl.getAllCategories);
router.post('/categories', adminCtrl.createCategory);
router.patch('/categories/:id', adminCtrl.updateCategory);
router.delete('/categories/:id', adminCtrl.deleteCategory);

// Report & Moderation (F-ADM-05)
router.get('/reports', adminCtrl.getAllReports);
router.patch('/reports/:id/status', adminCtrl.updateReportStatus);

// Dispute Handling (F-DIS-02)
router.get('/disputes', adminCtrl.getAllDisputes);
router.post('/disputes/:id/resolve', adminCtrl.resolveDispute);

module.exports = router;