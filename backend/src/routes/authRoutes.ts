import { Router } from 'express'
import { AuthController } from '../controllers/AuthController'
import { AuthMiddleware } from '../middleware/auth'

const router = Router()

// ================================================
// PUBLIC ROUTES (No authentication required)
// ================================================

// User registration
router.post('/register', 
  AuthController.registrationValidation,
  AuthController.register
)

// User login (both admin and user)
router.post('/login',
  AuthController.loginValidation,
  AuthController.login
)

// ================================================
// PROTECTED ROUTES (Authentication required)
// ================================================

// User logout
router.post('/logout',
  AuthMiddleware.authenticate,
  AuthController.logout
)

// Get current user profile
router.get('/me',
  AuthMiddleware.authenticate,
  AuthController.me
)

// Test endpoint for admin users
router.get('/admin/test',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  (req, res) => {
    res.json({
      success: true,
      message: 'Acesso admin autorizado!',
      user: req.user
    })
  }
)

// Test endpoint for regular users
router.get('/user/test',
  AuthMiddleware.authenticate,
  (req, res) => {
    res.json({
      success: true,
      message: 'Acesso de usuário autorizado!',
      user: req.user
    })
  }
)

export { router as authRoutes }