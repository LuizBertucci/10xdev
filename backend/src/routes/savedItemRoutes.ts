import { Router } from 'express'
import { SavedItemController } from '@/controllers/SavedItemController'
import { supabaseMiddleware, authenticate } from '@/middleware'

const router = Router()

// ================================================
// SAVED ITEMS ROUTES
// ================================================

// Todas as rotas requerem autenticação
router.use(supabaseMiddleware)
router.use(authenticate)

// Listar itens salvos do usuário
router.get('/', SavedItemController.list)

// Verificar se item está salvo
router.get('/check/:itemType/:itemId', SavedItemController.check)

// Verificar múltiplos itens
router.post('/check-multiple', SavedItemController.checkMultiple)

// Salvar item
router.post('/', SavedItemController.save)

// Remover item salvo
router.delete('/:itemType/:itemId', SavedItemController.unsave)

export { router as savedItemRoutes }

