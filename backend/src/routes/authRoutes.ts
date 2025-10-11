import { Router } from 'express'
import { authController } from '../controllers/AuthController'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()

// Public routes
router.post('/register', authController.register)
router.post('/login', authController.login)

// Protected routes
router.post('/logout', authMiddleware, authController.logout)
router.get('/profile', authMiddleware, authController.getProfile)

export default router
