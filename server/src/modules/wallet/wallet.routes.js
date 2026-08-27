const express = require("express")

const router = express.Router()

// ONLY CLIENTS SHOULD BE ABLE TO ACCESS THIS ROUTE
// router.get('/wallet', (req, res) => {
//     res.send('This is the wallet route')
// })

router.post('/wallet/deposit', (req, res) => {
    res.send('This is the wallet route')
})
// router.post('/wallet/withdraw', (req, res) => {
//     res.send('This is the wallet route')
// })

// router.get('/transactions?type=&page=', (req, res) => {
//     res.send('This is the wallet route')
// })




module.exports = router