const express = require('express')
const router = express.Router()

const { authenticate, authorize } = require('../../middleware/auth')

const jobsCTRL = require('./jobs.controller')

router.get('/', jobsCTRL.indexJob)

router.get('/mine', authenticate, authorize('client'), jobsCTRL.clientJobs)
router.post('/', authenticate, authorize('client'), jobsCTRL.createJob)

router.get('/:jobId', jobsCTRL.showJob)

router.patch('/:jobId', authenticate, authorize('client'), jobsCTRL.updateJob)
router.delete('/:jobId', authenticate, authorize('client'), jobsCTRL.deleteJob)

router.post('/:jobId/close', authenticate, authorize('client'), jobsCTRL.changeStatus)
router.post('/:jobId/reopen', authenticate, authorize('client'), jobsCTRL.changeStatus)

router.get('/', jobsCTRL.searchAndFilter)

module.exports = router