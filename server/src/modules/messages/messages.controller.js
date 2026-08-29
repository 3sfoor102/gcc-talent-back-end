const Conversation = require('../../models/Conversation')
const Message = require('../../models/Message  ')

const startConversation = async (req, res) => {
    try {

        const recipientId = req.body.recipientId
        const context = req.body.context

        if (!recipientId) {
            return res.status(400).json({ err: 'Recipient ID is required.' })
        }

        const existingQuery = {
            participants: { $all: [req.user._id, recipientId] }
        };

        if (context?.job) existingQuery['context.job'] = context.job
        if (context?.contract) existingQuery['context.contract'] = context.contract
        if (context?.gig) existingQuery['context.gig'] = context.gig

        let foundConversation = await Conversation.findOne(existingQuery)

        if (foundConversation) {
            return res.status(200).json(foundConversation)
        }

        newConversation = await Conversation.create({
            participants: [req.user._id, recipientId],
            context: context || {},
            unread: 0
        })

        return res.status(201).json(newConversation)

    } catch (err) {
        res.status(500).json({ err: err.message })
    }
}

const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({ participants: req.user._id })
            .populate('participants')
            .populate('context.job')
            .populate('context.contract')
            .sort('-updatedAt')

        return res.status(200).json({
            data: conversations,
            meta: { total: conversations.length }
        })

    } catch (err) {
        res.status(500).json({ err: err.message })
    }
}

const getMessages = async (req, res) => {
    try {

        const page = req.query.page || 1
        const limit = req.query.limit || 50

        const foundConversation = await Conversation.findById(req.params.conversationId)
        if (!foundConversation) {
            return res.status(404).json({ err: 'Conversation not found' })
        }

        if (!foundConversation.participants.includes(req.user._id.toString())) {
            return res.status(403).json({ err: 'You are not a participant in this conversation.' })
        }

        const pageNum = parseInt(page, 10)
        const limitNum = parseInt(limit, 10)
        const skip = (pageNum - 1) * limitNum

        const [messages, total] = await Promise.all([
            Message.find({ conversation: req.params.conversationId })
                .populate('sender')
                .sort('createdAt')
                .skip(skip)
                .limit(limitNum),
            Message.countDocuments({ conversation: req.params.conversationId })
        ])

        return res.status(200).json({
            data: messages,
            meta: { page: pageNum, limit: limitNum, total }
        })

    } catch (err) {
        res.status(500).json({ err: err.message })
    }
}

const sendMessage = async (req, res) => {
    try {

        const text = req.body.text

        const foundConversation = await Conversation.findById(req.params.conversationId);
        if (!foundConversation) {
            return res.status(404).json({ err: 'Conversation not found' })
        }

        if (!foundConversation.participants.includes(req.user._id.toString())) {
            return res.status(403).json({ err: 'You are not a participant in this conversation.' })
        }

        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map((file) => ({
                url: file.path,
                name: file.originalname
            }))
        }

        if (!text && attachments.length === 0) {
            return res.status(400).json({ err: 'Message must contain text or an attachment.' })
        }

        const newMessage = await Message.create({
            conversation: req.params.conversationId,
            sender: req.user._id,
            text,
            attachments,
            readBy: [req.user._id]
        })

        foundConversation.lastMessage = {
            text: text || 'Sent an attachment',
            sender: req.user._id,
            at: Date.now()
        }

        foundConversation.unread = (foundConversation.unread || 0) + 1

        await foundConversation.save()

        return res.status(201).json(newMessage)

    } catch (err) {
        res.status(500).json({ err: err.message })
    }
}

const markAsRead = async (req, res) => {
    try {
        const foundConversation = await Conversation.findById(req.params.conversationId)
        if (!foundConversation) {
            return res.status(404).json({ err: 'Conversation not found' })
        }

        if (!foundConversation.participants.includes(req.user._id.toString())) {
            return res.status(403).json({ err: 'You are not a participant in this conversation.' })
        }

        await Message.updateMany(
            { conversation: req.params.conversationId, readBy: { $ne: req.user._id } },
            { $push: { readBy: req.user._id } }
        )

        foundConversation.unread = 0
        await foundConversation.save()

        return res.status(200).json(foundConversation)

    } catch (err) {
        res.status(500).json({ err: err.message })
    }
}

module.exports = {
    startConversation,
    getConversations,
    getMessages,
    sendMessage,
    markAsRead
}