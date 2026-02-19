import { Router } from 'express'
import { ProjectController } from '@/controllers/ProjectController'
import { supabaseMiddleware, authenticate } from '@/middleware'

const router = Router()

// Todas as rotas de projetos requerem autenticação
router.use(supabaseMiddleware)
router.use(authenticate)

// ================================================
// GITHUB INTEGRATION (must be before /:id routes)
// ================================================
router.post('/validate-token', ProjectController.validateGithubToken)
router.post('/github-info', ProjectController.getGithubInfo)
router.post('/import-from-github', ProjectController.importFromGithub)

// ================================================
// GITSYNC (must be before /:id routes)
// ================================================
router.get('/gitsync/repos', ProjectController.listGithubRepos)

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
router.post('/:id/share', ProjectController.shareProject)

// CARDS MANAGEMENT
router.get('/:id/cards/all', ProjectController.getCardsAll)
router.get('/:id/cards', ProjectController.getCards)
router.post('/:id/cards', ProjectController.addCard)
router.patch('/:id/cards/:cardFeatureId/reorder', ProjectController.reorderCard)
router.delete('/:id/cards/:cardFeatureId', ProjectController.removeCard)

// GITSYNC PER PROJECT
router.post('/:id/gitsync/connect', ProjectController.connectRepo)
router.delete('/:id/gitsync/connect', ProjectController.disconnectRepo)
router.get('/:id/gitsync/status', ProjectController.getSyncStatus)
router.post('/:id/gitsync/sync', ProjectController.syncProject)
router.post('/:id/gitsync/push', ProjectController.pushToGithub)
router.post('/:id/gitsync/resolve', ProjectController.resolveConflict)

export { router as projectRoutes }

