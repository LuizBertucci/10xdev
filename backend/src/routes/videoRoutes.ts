import { Router } from 'express'
import { VideoController } from '@/controllers/VideoController'
import { supabaseMiddleware, authenticate, isAdmin } from '@/middleware'

const router = Router()

// Base: /api/videos

// Rotas públicas (leitura)
router.get('/', VideoController.list)
router.get('/:id', VideoController.getById)

// Rotas protegidas - apenas admins podem criar, editar e deletar vídeos
router.post('/', supabaseMiddleware, authenticate, isAdmin, VideoController.create)
router.put('/:id', supabaseMiddleware, authenticate, isAdmin, VideoController.update)
router.delete('/:id', supabaseMiddleware, authenticate, isAdmin, VideoController.delete)
router.patch('/:id/card-feature', supabaseMiddleware, authenticate, isAdmin, VideoController.updateSelectedCardFeature)

export { router as videoRoutes }

