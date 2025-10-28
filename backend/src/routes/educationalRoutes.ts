import { Router } from 'express'
import { EducationalVideoController } from '@/controllers/EducationalVideoController'

const router = Router()

// Base: /api/educational/videos
router.get('/videos', EducationalVideoController.list)
router.get('/videos/:id', EducationalVideoController.getById)
router.post('/videos', EducationalVideoController.create)
router.delete('/videos/:id', EducationalVideoController.delete)
router.patch('/videos/:id/card-feature', EducationalVideoController.updateSelectedCardFeature)

export { router as educationalRoutes }


