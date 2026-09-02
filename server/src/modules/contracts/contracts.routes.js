const express = require('express');
const router = express.Router();
const contractsController = require('./contracts.controller.js');
const verifyToken = require('../../middleware/verify-token.js');
const authorize = require('../../middleware/authorize.js');

router.use(verifyToken);

router.get('/', contractsController.getContracts);
router.get('/:id', contractsController.getContractById);

router.post('/:id/milestones', authorize('client'), contractsController.addMilestone);
router.patch('/:id/milestones/:mid', authorize('client'), contractsController.editMilestone);

router.post('/:id/milestones/:mid/fund', authorize('client'), contractsController.fundMilestone);
router.post('/:id/milestones/:mid/approve', authorize('client'), contractsController.approveMilestone);

router.post(
  '/:id/milestones/:mid/request-revision',
  authorize('client'),
  contractsController.requestMilestoneRevision
);

router.post('/:id/milestones/:mid/deliver', authorize('freelancer'), contractsController.deliverMilestone);

router.post('/:id/reviews', contractsController.createReview);

module.exports = router;