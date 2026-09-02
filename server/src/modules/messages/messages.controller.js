const Conversation = require('../../models/Conversation')
const Message = require('../../models/Message')

const startConversation = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;

        const recipientId = req.body.recipientId
        const context = req.body.context

        if (!recipientId) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Recipient ID is required.' }
            })
        }

        const existingQuery = {
            participants: { $all: [userId, recipientId] }
        };

        if (context?.job) existingQuery['context.job'] = context.job
        if (context?.contract) existingQuery['context.contract'] = context.contract
        if (context?.gig) existingQuery['context.gig'] = context.gig

        let foundConversation = await Conversation.findOne(existingQuery)
            .populate('participants', 'name avatarUrl role country ratingAvg')
            .populate('context.job', 'title')
            .populate('context.contract', 'title')

        if (foundConversation) {
            return res.status(200).json({
                success: true,
                data: foundConversation
            })
        }

        const created = await Conversation.create({
            participants: [userId, recipientId],
            context: context || {},
            unread: {}
        })

        const newConversation = await Conversation.findById(created._id)
            .populate('participants', 'name avatarUrl role country ratingAvg')
            .populate('context.job', 'title')
            .populate('context.contract', 'title')

        return res.status(201).json({
            success: true,
            data: newConversation
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const getConversations = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        const conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'name avatarUrl role country ratingAvg')
            .populate('context.job', 'title')
            .populate('context.contract', 'title')
            .sort('-updatedAt')

        return res.status(200).json({
            success: true,
            data: conversations,
            meta: { total: conversations.length }
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const getMessages = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;

        const page = parseInt(req.query.page, 10) || 1
        const limit = parseInt(req.query.limit, 10) || 50
        const skip = (page - 1) * limit

        const foundConversation = await Conversation.findById(req.params.conversationId)
        if (!foundConversation) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Conversation not found' }
            })
        }

        if (!foundConversation.participants.some(p => p.toString() === userId.toString())) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You are not a participant in this conversation.' }
            })
        }

        const [messages, total] = await Promise.all([
            Message.find({ conversation: req.params.conversationId })
                .populate('sender', 'name avatarUrl role')
                .sort('createdAt')
                .skip(skip)
                .limit(limit),
            Message.countDocuments({ conversation: req.params.conversationId })
        ])

        return res.status(200).json({
            success: true,
            data: messages,
            meta: { page, limit, total }
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const sendMessage = async (req, res) => {
    try {

        const userId = req.user._id || req.user.id || req.user.userId;
        const text = req.body.text

        const foundConversation = await Conversation.findById(req.params.conversationId);
        if (!foundConversation) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Conversation not found' }
            })
        }

        if (!foundConversation.participants.some(p => p.toString() === userId.toString())) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You are not a participant in this conversation.' }
            })
        }

        let attachments = []
        if (req.body.attachments && Array.isArray(req.body.attachments)) {
            attachments = req.body.attachments
        } else if (req.files && req.files.length > 0) {
            attachments = req.files.map((file) => ({
                url: file.path,
                name: file.originalname
            }))
        }

        if (!text && attachments.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Message must contain text or an attachment.' }
            })
        }

        const newMessage = await Message.create({
            conversation: req.params.conversationId,
            sender: userId,
            text,
            attachments,
            readBy: [userId]
        })

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'name avatarUrl role')

        foundConversation.lastMessage = {
            text: text || (attachments[0]?.name ? `📎 ${attachments[0].name}` : 'Sent an attachment'),
            sender: userId,
            at: Date.now()
        }

        const receiverId = foundConversation.participants.find(p => p.toString() !== userId.toString())?.toString()

        if (receiverId) {
            const currentUnread = foundConversation.unread?.get(receiverId) || 0
            foundConversation.unread.set(receiverId, currentUnread + 1)
        }

        await foundConversation.save()

        return res.status(201).json({
            success: true,
            data: populatedMessage
        })
    } catch (err) {
        console.error("Error in sendMessage:", err)
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        const foundConversation = await Conversation.findById(req.params.conversationId)
        if (!foundConversation) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Conversation not found' }
            })
        }

        if (!foundConversation.participants.some(p => p.toString() === userId.toString())) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You are not a participant in this conversation.' }
            })
        }

        await Message.updateMany(
            { conversation: req.params.conversationId, readBy: { $ne: userId } },
            { $push: { readBy: userId } }
        )

        if (foundConversation.unread && typeof foundConversation.unread.set === 'function') {
            foundConversation.unread.set(userId.toString(), 0)
            await foundConversation.save()
        }

        return res.status(200).json({
            success: true,
            data: foundConversation
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        })
    }
}

module.exports = {
    startConversation,
    getConversations,
    getMessages,
    sendMessage,
    markAsRead
}