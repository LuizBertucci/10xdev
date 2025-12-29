import { Router } from 'express'
import { UserController } from '@/controllers/UserController'
import { supabaseMiddleware, authenticate } from '@/middleware'

const router = Router()

// Todas as rotas de usuários requerem autenticação
router.use(supabaseMiddleware)
router.use(authenticate)

// Search users
router.get('/search', UserController.search)

// Get my cards
router.get('/my-cards', UserController.getMyCards)

// Change password
router.post('/change-password', UserController.changePassword)

export { router as userRoutes }

