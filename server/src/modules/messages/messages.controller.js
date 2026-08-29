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