import { Router } from 'express'
import { CardFeatureController } from '../controllers/CardFeatureController'

const router = Router()

// ================================================
// CARD FEATURES ROUTES
// ================================================

// STATISTICS - Deve vir ANTES das rotas com :id para evitar conflitos
router.get('/stats', CardFeatureController.getStats)

// SEARCH - Rota específica para busca
router.get('/search', CardFeatureController.search)

// BULK OPERATIONS
router.post('/bulk', CardFeatureController.bulkCreate)
router.delete('/bulk', CardFeatureController.bulkDelete)

// TECH FILTER - Rota específica para filtrar por tecnologia
router.get('/tech/:tech', CardFeatureController.getByTech)

// CRUD OPERATIONS
router.post('/', CardFeatureController.create)
router.get('/', CardFeatureController.getAll)
router.get('/:id', CardFeatureController.getById)
router.put('/:id', CardFeatureController.update)
router.delete('/:id', CardFeatureController.delete)

export { router as cardFeatureRoutes }