import express from 'express'
import Controller from './controller'

const router = express.Router()

router.post('/register', Controller.register)
router.post('/unregister', Controller.unregister)

export default router