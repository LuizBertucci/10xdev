import { Router } from 'express'
import { SupabaseController } from '@/controllers/SupabaseController'
import { supabaseMiddleware } from '@/middleware/supabaseMiddleware'

const router = Router()

// ================================================
// AUTHENTICATION ROUTES
// ================================================

// Rotas públicas (sem autenticação)
router.post('/register', SupabaseController.register)
router.post('/login', SupabaseController.login)
router.delete('/logout', SupabaseController.logout)

// Rotas protegidas (requerem autenticação)
router.get('/profile', supabaseMiddleware, SupabaseController.showProfile)
router.put('/profile', supabaseMiddleware, SupabaseController.updateProfile)
router.delete('/profile', supabaseMiddleware, SupabaseController.deleteAccount)

export { router as authRoutes }

