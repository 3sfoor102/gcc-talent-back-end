const express = require('express')
const router = express.Router()

const verifyToken = require('../../middleware/verify-token')
const upload = require('../../config/multer')
const msgCTRL = require('./messages.controller')

router.post('/', verifyToken, msgCTRL.startConversation)
router.get('/', verifyToken, msgCTRL.getConversations)

router.get('/:conversationId/messages', verifyToken, msgCTRL.getMessages)
router.post('/:conversationId/read', verifyToken, msgCTRL.markAsRead)

router.post(
    '/:conversationId/messages',
    verifyToken,
    upload.array('attachments', 5),
    msgCTRL.sendMessage
)

module.exports = router