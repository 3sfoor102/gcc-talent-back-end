const jobController = require('./jobs.controller')

// might need to reuqire the verify-token middleware!
// const verifyToken = require('./middleware/verify-token')
// app.use(verifyToken)


app.get('/jobs', jobController.indexJob)
