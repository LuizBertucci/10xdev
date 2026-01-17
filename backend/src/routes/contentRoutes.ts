import { Router } from 'express'
import { ContentController } from '@/controllers/ContentController'
import { supabaseMiddleware, authenticate, requireAdmin } from '@/middleware'

const router = Router()

// Base: /api/contents

// ================================================
// ROTAS PÚBLICAS (leitura)
// ================================================
router.get('/', ContentController.list)
router.get('/:id', ContentController.getById)

// ================================================
// ROTAS PROTEGIDAS (admin only - escrita)
// ================================================
router.post('/', supabaseMiddleware, authenticate, requireAdmin, ContentController.create)
router.put('/:id', supabaseMiddleware, authenticate, requireAdmin, ContentController.update)
router.delete('/:id', supabaseMiddleware, authenticate, requireAdmin, ContentController.delete)
router.patch('/:id/card-feature', supabaseMiddleware, authenticate, requireAdmin, ContentController.updateSelectedCardFeature)

export { router as contentRoutes }
