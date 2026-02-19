import { Router } from 'express'
import { ExampleController } from '@/controllers/ExampleController'
import { supabaseMiddleware, optionalAuth } from '@/middleware'
import { generalRateLimit, writeOperationsRateLimit } from '@/middleware'

const router = Router()

// Public routes (with optional auth)
router.get('/', generalRateLimit, optionalAuth, ExampleController.getAll)
router.get('/:id', generalRateLimit, optionalAuth, ExampleController.getById)

// Protected routes (require auth)
router.post('/', writeOperationsRateLimit, supabaseMiddleware, ExampleController.create)
router.put('/:id', writeOperationsRateLimit, supabaseMiddleware, ExampleController.update)
router.delete('/:id', writeOperationsRateLimit, supabaseMiddleware, ExampleController.delete)

export { router as exampleRoutes }
