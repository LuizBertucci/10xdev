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

// BULK OPERATIONS - Requerem privilégios de administrador
router.post('/bulk', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.bulkCreate)
router.delete('/bulk', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.bulkDelete)

// Rotas de escrita: requerem privilégios de administrador (seguindo padrão projectRoutes)
router.post('/', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.create)
router.put('/:id', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.update)
router.delete('/:id', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.delete)

export { router as cardFeatureRoutes }