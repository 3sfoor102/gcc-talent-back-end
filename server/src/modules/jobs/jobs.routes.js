const express = require('express')
const router = express.Router()

const authorize = require('../../middleware/authorize')
const verifyToken = require('../../middleware/verify-token')

const jobsCTRL = require('./jobs.controller')
const proposalCTRL = require('../proposals/proposals.controller')

router.get('/', jobsCTRL.indexJob)

router.get('/categories', jobsCTRL.getCategories);
router.get('/skills', jobsCTRL.getSkills);

router.get('/mine', verifyToken, authorize('client'), jobsCTRL.clientJobs)
router.post('/', verifyToken, authorize('client'), jobsCTRL.createJob)

router.get('/:jobId', jobsCTRL.showJob)

router.patch('/:jobId', verifyToken, authorize('client'), jobsCTRL.updateJob)
router.delete('/:jobId', verifyToken, authorize('client'), jobsCTRL.deleteJob)

router.post('/:jobId/close', verifyToken, authorize('client'), jobsCTRL.changeStatus)
router.post('/:jobId/reopen', verifyToken, authorize('client'), jobsCTRL.changeStatus)

router.post('/:jobId/proposals', verifyToken, authorize('freelancer'), proposalCTRL.createProposal)
router.get('/:jobId/proposals', verifyToken, authorize('client'), proposalCTRL.getJobProposals)

module.exports = router