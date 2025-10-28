import { Router } from 'express'
import { EducationalVideoController } from '@/controllers/EducationalVideoController'

const router = Router()

// Base: /api/educational/videos
router.get('/videos', EducationalVideoController.list)
router.get('/videos/:id', EducationalVideoController.getById)
router.post('/videos', EducationalVideoController.create)
router.delete('/videos/:id', EducationalVideoController.delete)

export { router as educationalRoutes }


