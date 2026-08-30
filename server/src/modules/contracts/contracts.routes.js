const express = require('express')
const router = express.Router()
const { authenticate } = require('../../middleware/auth')
const contractsCTRL = require('../controllers/contracts.controller')

const { createReview } = require('../controllers/reviews.controller')


router.get('/', authenticate, contractsCTRL.listContracts)
router.get('/:contractId', authenticate, contractsCTRL.showContract)

router.post('/:contractId/milestones', authenticate, contractsCTRL.addMilestone)
router.patch('/:contractId/milestones/:milestoneId', authenticate, contractsCTRL.editMilestone)

router.post('/:contractId/reviews', authenticate, contractsCTRL.createReview)

module.exports = router