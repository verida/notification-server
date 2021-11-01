import express from 'express'
import bodyParser from 'body-parser'
import router from './routes'
import DbManager from './dbManager'

import dotenv from 'dotenv'
dotenv.config()

// Set up the express app
const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(router)

DbManager.ensureDb(process.env.DB_DEVICE_LOOKUP)

const PORT = process.env.PORT ? process.env.PORT : 5011;
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`)
});