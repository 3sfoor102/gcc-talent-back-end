const express = require('express')
const router = express.Router()

const { authenticate } = require('../../middleware/auth')
const upload = require('../../middleware/upload')
const msgCTRL = require('../controllers/messages.controller')


router.post('/', authenticate, msgCTRL.startConversation)
router.get('/', authenticate, msgCTRL.getConversations)

router.get('/:conversationId/messages', authenticate, msgCTRL.getMessages)
router.post('/:conversationId/read', authenticate, msgCTRL.markAsRead)

router.post(
    '/:conversationId/messages',
    authenticate,
    upload.array('attachments', 5),
    msgCTRL.sendMessage
)

module.exports = router