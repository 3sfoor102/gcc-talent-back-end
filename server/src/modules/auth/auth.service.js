const jwt = require('jsonwebtoken')

const bcrypt = require('bcrypt')

const User = require('../../models/User')


const generateAccessToken = function (id, role)
{
    return jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES })
}