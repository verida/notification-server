import express from 'express'
import bodyParser from 'body-parser'
import router from './routes'
import cors from 'cors'
import Db from './db'
const basicAuth = require('express-basic-auth')
import RequestValidator from './request-validator'

import dotenv from 'dotenv'
dotenv.config()

// Set up the express app
const app = express()
const validator = new RequestValidator()

// Disable CORS
app.use(cors({}))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(basicAuth({
  authorizer: validator.authorize,
  authorizeAsync: true,
  unauthorizedResponse: validator.getUnauthorizedResponse
}))
app.use(router)

Db.init()

const PORT = process.env.PORT ? process.env.PORT : 5011;
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`)
});