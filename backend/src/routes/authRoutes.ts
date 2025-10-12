import { Router } from 'express'
import { AuthController } from '../controllers/AuthController'
import { supabaseMiddleware } from '../middleware/supabaseMiddleware'

const router = Router()

// Registration routes
router.post('/registrations', AuthController.register)

// Session routes (login/logout)
router.post('/sessions', AuthController.login)
router.delete('/sessions', supabaseMiddleware, AuthController.logout)

// Member routes (authenticated user profile)
router.get('/members', supabaseMiddleware, AuthController.showProfile)
router.put('/members', supabaseMiddleware, AuthController.updateProfile)
router.delete('/members', supabaseMiddleware, AuthController.deleteAccount)

export default router
