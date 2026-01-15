import { Router } from 'express'
import { CardFeatureController } from '@/controllers/CardFeatureController'
import { supabaseMiddleware, optionalAuth, authenticate, requireAdmin } from '@/middleware'

const router = Router()

// ================================================
// CARD FEATURES ROUTES
// ================================================

// Rotas de leitura: optionalAuth permite acesso público mas popula req.user se autenticado
// Isso permite que admins vejam todos os cards (incluindo privados)

// STATISTICS - Deve vir ANTES das rotas com :id para evitar conflitos
router.get('/stats', CardFeatureController.getStats)

// SEARCH - Rota específica para busca (com autenticação opcional para filtrar visibilidade)
router.get('/search', optionalAuth, CardFeatureController.search)

// TECH FILTER - Rota específica para filtrar por tecnologia
router.get('/tech/:tech', optionalAuth, CardFeatureController.getByTech)

// CRUD OPERATIONS - Leitura (com autenticação opcional para filtrar visibilidade)
router.get('/', optionalAuth, CardFeatureController.getAll)
router.get('/:id', optionalAuth, CardFeatureController.getById)

// MODERATION - Admin-only
router.post('/:id/approve', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.approve)
router.post('/:id/reject', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.reject)

// SHARING - Compartilhamento de cards privados (autenticado)
router.post('/:id/share', supabaseMiddleware, authenticate, CardFeatureController.shareCard)
router.delete('/:id/share/:userId', supabaseMiddleware, authenticate, CardFeatureController.unshareCard)
router.get('/:id/shares', supabaseMiddleware, authenticate, CardFeatureController.getCardShares)

// BULK OPERATIONS - Requerem privilégios de administrador
router.post('/bulk', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.bulkCreate)
router.delete('/bulk', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.bulkDelete)

// Rotas de escrita: usuário autenticado pode criar/editar/deletar seus próprios cards.
// A moderação (aprovar/rejeitar) permanece restrita a admins via endpoints específicos.
router.post('/', supabaseMiddleware, authenticate, CardFeatureController.create)
router.put('/:id', supabaseMiddleware, authenticate, CardFeatureController.update)
router.delete('/:id', supabaseMiddleware, authenticate, CardFeatureController.delete)

export { router as cardFeatureRoutes }