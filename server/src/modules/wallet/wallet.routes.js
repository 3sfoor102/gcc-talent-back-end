const express = require('express');
const walletController = require('./wallet.controller.js');
const verifyToken = require('../../middleware/verifyToken.js');
const authorize = require('../../middleware/authorize.js');

const router = express.Router();

router.use(verifyToken);

router.get('/', walletController.getWallet);
router.post('/deposit', authorize('client'), walletController.deposit);
router.post('/withdraw', authorize('freelancer'), walletController.withdraw);

module.exports = router;
