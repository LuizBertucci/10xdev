import { Router } from 'express'
import { ProjectController } from '@/controllers/ProjectController'
import { supabaseMiddleware, authenticate } from '@/middleware'

const router = Router()

// Todas as rotas de projetos requerem autenticação
router.use(supabaseMiddleware)
router.use(authenticate)

// ================================================
// PROJECTS ROUTES
// ================================================

// GITHUB INTEGRATION
router.post('/github-info', ProjectController.getGithubInfo)

// CRUD OPERATIONS
router.post('/', ProjectController.create)
router.get('/', ProjectController.getAll)
router.get('/:id', ProjectController.getById)
router.put('/:id', ProjectController.update)
router.delete('/:id', ProjectController.delete)

// MEMBERS MANAGEMENT
router.get('/:id/members', ProjectController.getMembers)
router.post('/:id/members', ProjectController.addMember)
router.put('/:id/members/:userId', ProjectController.updateMember)
router.delete('/:id/members/:userId', ProjectController.removeMember)

// CARDS MANAGEMENT
router.get('/:id/cards', ProjectController.getCards)
router.post('/:id/cards', ProjectController.addCard)
router.patch('/:id/cards/:cardFeatureId/reorder', ProjectController.reorderCard)
router.delete('/:id/cards/:cardFeatureId', ProjectController.removeCard)

export { router as projectRoutes }

