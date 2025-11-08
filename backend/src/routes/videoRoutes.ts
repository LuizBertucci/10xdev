import { Router } from 'express'
import { VideoController } from '@/controllers/VideoController'

const router = Router()

// Base: /api/videos
router.get('/', VideoController.list)
router.get('/:id', VideoController.getById)
router.post('/', VideoController.create)
router.put('/:id', VideoController.update)
router.delete('/:id', VideoController.delete)
router.patch('/:id/card-feature', VideoController.updateSelectedCardFeature)

export { router as videoRoutes }

