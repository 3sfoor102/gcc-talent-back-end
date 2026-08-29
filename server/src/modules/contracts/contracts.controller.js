const contractService = require('./contracts.service.js')

const getContracts = async (req, res, next) => {
    try {
        const userId = req.user._id
        const role = req.user.role
        const {status} = req.query

        const result = await contractService.getUserContracts(userId, role, status)

        res.status(200).json({
            success: true, 
            data: result,
     })

    } catch (error) {
        next(error)
    }

}

const getContractsById = async (req, res, next)=> {
    try {
        const contractId = req.params._id
        const userId = req.user._idc
        const role = req.user.role

        const result = await contractService.getContractWorkspace(contractId, userId, role)

        res.status(200).json({
        success: true, 
        data: result,
     })
    } catch (error) {
        next(error)
    }
}
const addMilestone = async (req, res, next) => {
  try {
    const contractId = req.params.id;
    const clientId = req.user._id;
    const milestoneData = req.body; 

    const result = await contractsService.addMilestone(contractId, clientId, milestoneData);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

const fundMilestone = async (req, res, next) => {
  try {
    const {id: contractId, mid: milestoneId} = req.params
    const clientId = req.user._id

    const result = await contractsService.fundMilestone(contractId, milestoneId, clientid);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
const deliverMilestone = async (req, res, next) => {
  try {
    const {id: contractId, mid: milestoneId} = req.params
    const freelancerId = req.user._id
    const deliveryData = req.body

    const result = await contractsService.deliverMilestone(contractId, milestoneId, freelancerId, deliveryData);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

