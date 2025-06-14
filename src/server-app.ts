import express from 'express'
import bodyParser from 'body-parser'
import router from './routes'
import cors from 'cors'
import Db from './db'
const basicAuth = require('express-basic-auth')
import RequestValidator from './request-validator'
import Controller from './controller'

import dotenv from 'dotenv'
dotenv.config()

// Set up the express app
const app = express()
const validator = new RequestValidator()

// Disable CORS
app.use(cors({}))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(router.post('/ping', Controller.ping))
app.use(basicAuth({
  authorizer: validator.authorize,
  authorizeAsync: true,
  unauthorizedResponse: validator.getUnauthorizedResponse
}))
app.use(router)

Db.init()

module.exports=app