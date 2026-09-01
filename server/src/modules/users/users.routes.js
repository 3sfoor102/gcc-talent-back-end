const express = require('express')
const router = express.Router()
const contractsCTRL = require('../contracts/contracts.controller')

router.get('/:userId/reviews', contractsCTRL.listUserReviews)

module.exports = router