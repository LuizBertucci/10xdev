import { Router } from 'express'
import { AdminController } from '@/controllers/AdminController'
import { supabaseMiddleware, authenticate } from '@/middleware'
import { isAdmin } from '@/middleware/isAdmin'

const router = Router()

// ================================================
// ADMIN ROUTES
// ================================================

// IMPORTANTE: Todas as rotas administrativas requerem:
// 1. supabaseMiddleware - Valida JWT token do Supabase
// 2. authenticate - Garante que req.user existe
// 3. isAdmin - Garante que o usuário é administrador

// Aplicar middlewares em todas as rotas deste router
router.use(supabaseMiddleware)
router.use(authenticate)
router.use(isAdmin)

// ================================================
// SYSTEM STATISTICS
// ================================================

// GET /api/admin/stats - Estatísticas gerais do sistema
router.get('/stats', AdminController.getSystemStats)

// ================================================
// USER MANAGEMENT
// ================================================

// GET /api/admin/users - Lista todos os usuários com estatísticas
router.get('/users', AdminController.listUsers)

// GET /api/admin/users/:id - Busca usuário específico com detalhes
router.get('/users/:id', AdminController.getUserById)

// PUT /api/admin/users/:id/role - Atualiza role do usuário
router.put('/users/:id/role', AdminController.updateUserRole)

// PUT /api/admin/users/:id/status - Atualiza status do usuário (ativo/inativo)
router.put('/users/:id/status', AdminController.updateUserStatus)

// DELETE /api/admin/users/:id - Deleta usuário
router.delete('/users/:id', AdminController.deleteUser)

export { router as adminRoutes }
