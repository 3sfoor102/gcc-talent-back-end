const express = require("express")
const Transaction = require("server/src/models/Transaction.js")

const deposit = async (req, res) => {
     try {
        req.body.user._id = req.user._id
        const TransactionData = await Transaction.findById(req.params.transactionId)
        amount = req.body.amount
        meta = req.body.meta

        
     } catch (error) {
        res.status(401).json({You })
     }

}