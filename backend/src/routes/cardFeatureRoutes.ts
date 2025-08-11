import { Router } from 'express'
import { CardFeatureController } from '@/controllers/CardFeatureController'
import { verifyUser, requireAdmin } from '@/middleware/auth'

const router = Router()

// ================================================
// CARD FEATURES ROUTES
// ================================================

// PUBLIC ROUTES - Usuários podem visualizar (sem autenticação)
// STATISTICS - Deve vir ANTES das rotas com :id para evitar conflitos
router.get('/stats', CardFeatureController.getStats)

// SEARCH - Rota específica para busca
router.get('/search', CardFeatureController.search)

// TECH FILTER - Rota específica para filtrar por tecnologia
router.get('/tech/:tech', CardFeatureController.getByTech)

// READ OPERATIONS - Usuários podem visualizar
router.get('/', CardFeatureController.getAll)
router.get('/:id', CardFeatureController.getById)

// ADMIN ONLY ROUTES - before_action :verify_user (requer admin)
// BULK OPERATIONS
router.post('/bulk', verifyUser, requireAdmin, CardFeatureController.bulkCreate)
router.delete('/bulk', verifyUser, requireAdmin, CardFeatureController.bulkDelete)

// WRITE OPERATIONS - Apenas admins podem criar/editar/deletar
router.post('/', verifyUser, requireAdmin, CardFeatureController.create)
router.put('/:id', verifyUser, requireAdmin, CardFeatureController.update)
router.delete('/:id', verifyUser, requireAdmin, CardFeatureController.delete)

export { router as cardFeatureRoutes }