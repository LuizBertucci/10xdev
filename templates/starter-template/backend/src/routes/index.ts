import { Router } from 'express'
import { exampleRoutes } from './exampleRoutes'
import { authRoutes } from './authRoutes'

const router = Router()

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  })
})

// Routes
router.use('/auth', authRoutes)
router.use('/examples', exampleRoutes)

// API Info
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Starter Template API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        profile: 'GET /api/auth/profile'
      },
      examples: {
        list: 'GET /api/examples',
        getById: 'GET /api/examples/:id',
        create: 'POST /api/examples',
        update: 'PUT /api/examples/:id',
        delete: 'DELETE /api/examples/:id'
      }
    }
  })
})

// 404
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  })
})

export { router as apiRoutes }
