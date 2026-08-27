const express = require("express")

const router = express.Router()

// ONLY CLIENTS SHOULD BE ABLE TO ACCESS THIS ROUTE
router.get('/wallet', (req, res) => {
    res.send('This is the wallet route')
})



module.exports = router