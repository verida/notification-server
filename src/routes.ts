import express from 'express'
import Controller from './controller'

const router = express.Router()

router.post('/register', Controller.register)
router.get('/ping', Controller.ping)

export default router