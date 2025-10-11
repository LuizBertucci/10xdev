import { Router } from 'express'
import { authController } from '../controllers/AuthController'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()

/**
 * @route   POST /api/auth/register
 * @desc    Registrar novo usuário
 * @access  Public
 */
router.post('/register', authController.register)

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuário
 * @access  Public
 */
router.post('/login', authController.login)

/**
 * @route   POST /api/auth/logout
 * @desc    Logout de usuário
 * @access  Private
 */
router.post('/logout', authMiddleware, authController.logout)

/**
 * @route   GET /api/auth/profile
 * @desc    Obter perfil do usuário autenticado
 * @access  Private
 */
router.get('/profile', authMiddleware, authController.getProfile)

/**
 * @route   PUT /api/auth/profile
 * @desc    Atualizar perfil do usuário
 * @access  Private
 */
router.put('/profile', authMiddleware, authController.updateProfile)

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken)

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Solicitar recuperação de senha
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword)

/**
 * @route   POST /api/auth/reset-password
 * @desc    Redefinir senha
 * @access  Public (com token de reset)
 */
router.post('/reset-password', authController.resetPassword)

export default router
