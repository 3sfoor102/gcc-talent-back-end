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

