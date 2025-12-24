import { Router } from 'express'
import { CardFeatureController } from '@/controllers/CardFeatureController'
import { supabaseMiddleware, authenticate, requireAdmin } from '@/middleware'

const router = Router()

// ================================================
// CARD FEATURES ROUTES
// ================================================

// Rotas de leitura: middleware opcional (permitir acesso público)
// O controller verifica req.user opcionalmente para filtrar visibilidade

// STATISTICS - Deve vir ANTES das rotas com :id para evitar conflitos
router.get('/stats', CardFeatureController.getStats)

// SEARCH - Rota específica para busca
router.get('/search', CardFeatureController.search)

// TECH FILTER - Rota específica para filtrar por tecnologia
router.get('/tech/:tech', CardFeatureController.getByTech)

// CRUD OPERATIONS - Leitura (público)
router.get('/', CardFeatureController.getAll)
router.get('/:id', CardFeatureController.getById)

// Rotas de escrita: middleware obrigatório (seguindo padrão projectRoutes)
router.post('/', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.create)
router.put('/:id', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.update)
router.delete('/:id', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.delete)

// BULK OPERATIONS - Requerem autenticação
router.post('/bulk', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.bulkCreate)
router.delete('/bulk', supabaseMiddleware, authenticate, requireAdmin, CardFeatureController.bulkDelete)

export { router as cardFeatureRoutes }