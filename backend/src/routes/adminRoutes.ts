import { Router } from 'express'
import { AdminController } from '@/controllers/AdminController'
import { supabaseMiddleware, authenticate } from '@/middleware'
import { isAdmin } from '@/middleware/isAdmin'

const router = Router()

// ================================================
// ADMIN ROUTES
// ================================================

// Instrumentação: latência e timeout por rota admin
router.use((req, res, next) => {
  const startNs = process.hrtime.bigint()
  const timeoutMs = Number(process.env.ADMIN_RESPONSE_TIMEOUT_MS) || Number(process.env.RESPONSE_TIMEOUT_MS) || 20000

  // Timeout específico do admin (sobrescreve o geral se menor)
  res.setTimeout(timeoutMs, () => {
    const rid = res.getHeader('X-Request-ID') || req.headers['x-request-id']
    console.error(`[admin-timeout] ${req.method} ${req.originalUrl} após ${timeoutMs}ms rid=${String(rid ?? '')}`)
    if (!res.headersSent) {
      res.status(504).json({ success: false, error: 'Timeout: operação admin demorou para responder' })
    }
  })

  res.on('finish', () => {
    const durMs = Number(process.hrtime.bigint() - startNs) / 1_000_000
    const rid = res.getHeader('X-Request-ID') || req.headers['x-request-id']
    console.log(`[admin] ${req.method} ${req.originalUrl} ${res.statusCode} ${durMs.toFixed(1)}ms rid=${String(rid ?? '')}`)
  })

  next()
})

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
// HISTORICAL DATA
// ================================================

// GET /api/admin/history/cards - Dados históricos de criação de cards
router.get('/history/cards', AdminController.getCardsHistory)

// GET /api/admin/history/users - Dados históricos de cadastro de usuários
router.get('/history/users', AdminController.getUsersHistory)

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
