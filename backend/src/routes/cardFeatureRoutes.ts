import { Router } from 'express'
import { CardFeatureController } from '@/controllers/CardFeatureController'
import { supabaseMiddleware, authenticate } from '@/middleware'

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
router.post('/', supabaseMiddleware, authenticate, CardFeatureController.create)
router.put('/:id', supabaseMiddleware, authenticate, CardFeatureController.update)
router.delete('/:id', supabaseMiddleware, authenticate, CardFeatureController.delete)

// BULK OPERATIONS - Requerem autenticação
router.post('/bulk', supabaseMiddleware, authenticate, CardFeatureController.bulkCreate)
router.delete('/bulk', supabaseMiddleware, authenticate, CardFeatureController.bulkDelete)

// CARD SHARING - Compartilhar card privado com emails
router.post('/:id/share', supabaseMiddleware, authenticate, CardShareController.shareWithEmails)

export { router as cardFeatureRoutes }