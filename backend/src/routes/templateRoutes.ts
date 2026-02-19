import { Router } from 'express'
import { TemplateController } from '@/controllers/TemplateController'
import { supabaseMiddleware, authenticate, requireAdmin } from '@/middleware'

const router = Router()

// Base: /api/templates

// ================================================
// ROTAS PÚBLICAS (leitura)
// ================================================
router.get('/', TemplateController.list)
router.get('/:id', TemplateController.getById)

// ================================================
// ROTAS PROTEGIDAS (admin only - escrita)
// ================================================
router.post('/', supabaseMiddleware, authenticate, requireAdmin, TemplateController.create)
router.put('/:id', supabaseMiddleware, authenticate, requireAdmin, TemplateController.update)

export { router as templateRoutes }
