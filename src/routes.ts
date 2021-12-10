import express from 'express'
import Controller from './controller'

const router = express.Router()

router.post('/register', Controller.register)
router.post('/ping', Controller.ping)

export default router