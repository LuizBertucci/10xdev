import { Router } from 'express'
import { supabaseMiddleware, authenticate, requireAdmin } from '@/middleware'
import { AdminController } from '@/controllers/AdminController'

const router = Router()

// Todas as rotas admin requerem autenticação + role admin
router.use(supabaseMiddleware)
router.use(authenticate)
router.use(requireAdmin)

router.get('/users', AdminController.listUsers)
router.patch('/users/:id/status', AdminController.setUserStatus)
router.patch('/users/:id/role', AdminController.setUserRole)
router.delete('/users/:id', AdminController.deleteUser)

export { router as adminRoutes }
