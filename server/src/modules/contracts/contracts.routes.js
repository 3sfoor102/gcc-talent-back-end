const express = require('express')
const router = express.Router()
const { authenticate } = require('../../middleware/auth')
const contractsCTRL = require('../controllers/contracts.controller')

router.post('/:contractId/reviews', authenticate, contractsCTRL.createReview)

module.exports = router