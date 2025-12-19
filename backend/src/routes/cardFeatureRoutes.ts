import { Router } from 'express'
import { CardFeatureController } from '@/controllers/CardFeatureController'
import { supabaseMiddleware, authenticate } from '@/middleware'

const router = Router()

// ================================================
// MIDDLEWARE OPCIONAL (popula req.user se token presente)
// ================================================
router.use(supabaseMiddleware)

// ================================================
// ROTAS PÚBLICAS (autenticação opcional)
// ================================================

// STATISTICS - Deve vir ANTES das rotas com :id para evitar conflitos
router.get('/stats', CardFeatureController.getStats)

// SEARCH - Rota específica para busca
router.get('/search', CardFeatureController.search)

// TECH FILTER - Rota específica para filtrar por tecnologia
router.get('/tech/:tech', CardFeatureController.getByTech)

// CRUD OPERATIONS - Leitura pública (auth opcional para ?my=true)
router.get('/', CardFeatureController.getAll)
router.get('/:id', CardFeatureController.getById)

// ================================================
// ROTAS PROTEGIDAS (autenticação obrigatória)
// ================================================

// CREATE - Autenticação obrigatória
router.post('/', authenticate, CardFeatureController.create)

// UPDATE
router.put('/:id', authenticate, CardFeatureController.update)

// DELETE
router.delete('/:id', authenticate, CardFeatureController.delete)

// BULK OPERATIONS
router.post('/bulk', authenticate, CardFeatureController.bulkCreate)
router.delete('/bulk', authenticate, CardFeatureController.bulkDelete)

export { router as cardFeatureRoutes }