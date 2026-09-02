const express = require('express');
const walletController = require('./wallet.controller.js');
const verifyToken = require('../../middleware/verify-token.js');
const authorize = require('../../middleware/authorize.js');

const router = express.Router();

router.use(verifyToken);

router.get('/', walletController.getWallet);
router.get('/transactions', walletController.getTransactions);
router.post('/deposit', authorize('client', 'freelancer'), walletController.deposit);
router.post('/withdraw', authorize('client', 'freelancer'), walletController.withdraw);
module.exports = router;
