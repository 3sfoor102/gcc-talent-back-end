const express = require('express')
const router = express.Router()

const authorize = require('../../middleware/authorize')
const verifyToken = require('../../middleware/verify-token')

const proposalCTRL = require('./proposals.controller')


router.use(verifyToken)

// Freelancer routes
router.get('/mine', authorize('freelancer'), proposalCTRL.getMyProposals)
router.patch('/:proposalId', authorize('freelancer'), proposalCTRL.updateProposal)
router.post('/:proposalId/withdraw', authorize('freelancer'), proposalCTRL.withdrawProposal)

// Client decision routes (POST per Section 09)
router.post('/:proposalId/accept', authorize('client'), proposalCTRL.acceptProposal)
router.post('/:proposalId/shortlist', authorize('client'), proposalCTRL.shortlistProposal)
router.post('/:proposalId/decline', authorize('client'), proposalCTRL.declineProposal)

module.exports = router