import { Router } from 'express'
import { UserController } from '@/controllers/UserController'

const router = Router()

// Search users
router.get('/search', UserController.search)

export { router as userRoutes }

