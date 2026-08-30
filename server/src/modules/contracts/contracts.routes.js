const express = require('express');
const contractsController = require('./contracts.controller.js');
const verifyToken = require('../../middleware/verify-token.js');
const authorize = require('../../middleware/authorize.js');

const router = express.Router();

router.use(verifyToken);

router.get('/', contractsController.getContracts);
router.get('/:id', contractsController.getContractById);

router.post('/:id/milestones', authorize('client'), contractsController.addMilestone);
router.post('/:id/milestones/:mid/fund', authorize('client'), contractsController.fundMilestone);
router.post('/:id/milestones/:mid/approve', authorize('client'), contractsController.approveMilestone);

router.post('/:id/milestones/:mid/deliver', authorize('freelancer'), contractsController.deliverMilestone);

module.exports = router;