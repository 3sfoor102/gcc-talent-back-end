const express = require("express")

const walletService = require('../services/wallet.service.js');

const deposit = async (req, res, next) => {
    try {
        const userId = req.user._id; 
        
        const { amount, card } = req.body;

        const result = await walletService.processDeposit(userId, amount, card);

        res.status(200).json({
            success: true,
            data: result
        });
        
    } catch (error) {
        next(error);
    }
};

module.exports = { deposit };