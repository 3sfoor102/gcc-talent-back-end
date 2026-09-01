const express = require('express')
const router = express.Router()

const authorize = require('../../middleware/authorize')
const verifyToken = require('../../middleware/verify-token')

const proposalCTRL = require('./proposals.controller')

// Freelancer routes
router.get('/mine', verifyToken, authorize('freelancer'), proposalCTRL.getMyProposals)
router.post('/jobs/:jobId', verifyToken, authorize('freelancer'), proposalCTRL.createProposal)
router.put('/:proposalId', verifyToken, authorize('freelancer'), proposalCTRL.updateProposal)
router.patch('/:proposalId/withdraw', verifyToken, authorize('freelancer'), proposalCTRL.withdrawProposal)

// Client routes
router.get('/jobs/:jobId', verifyToken, authorize('client'), proposalCTRL.getJobProposals)
router.patch('/:proposalId/accept', verifyToken, authorize('client'), proposalCTRL.acceptProposal)
router.patch('/:proposalId/shortlist', verifyToken, authorize('client'), proposalCTRL.shortlistProposal)
router.patch('/:proposalId/decline', verifyToken, authorize('client'), proposalCTRL.declineProposal)

module.exports = router