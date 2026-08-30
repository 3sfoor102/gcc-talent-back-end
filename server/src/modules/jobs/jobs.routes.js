const express = require('express')
const router = express.Router()
const jobsCTRL = require('../controllers/jobs.controller')

router.get('/', jobsCTRL.searchAndFilter)

module.exports = router