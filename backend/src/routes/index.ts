import { Router } from 'express'
import { cardFeatureRoutes } from './cardFeatureRoutes'
import authRoutes from './authRoutes'

const router = Router()

// ================================================
// API ROUTES - Version 1
// ================================================

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '10xDev Backend API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Auth routes
router.use('/auth', authRoutes)

// CardFeatures routes
router.use('/card-features', cardFeatureRoutes)

// API Info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '10xDev Backend API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        registrations: {
          show: 'GET /api/auth/registrations',
          create: 'POST /api/auth/registrations'
        },
        sessions: {
          show: 'GET /api/auth/sessions',
          login: 'POST /api/auth/sessions',
          logout: 'DELETE /api/auth/sessions'
        },
        members: {
          profile: 'GET /api/auth/members',
          update: 'PUT /api/auth/members',
          delete: 'DELETE /api/auth/members'
        }
      },
      cardFeatures: {
        list: 'GET /api/card-features',
        create: 'POST /api/card-features',
        getById: 'GET /api/card-features/:id',
        update: 'PUT /api/card-features/:id',
        delete: 'DELETE /api/card-features/:id',
        search: 'GET /api/card-features/search?q=term',
        byTech: 'GET /api/card-features/tech/:tech',
        stats: 'GET /api/card-features/stats',
        bulkCreate: 'POST /api/card-features/bulk',
        bulkDelete: 'DELETE /api/card-features/bulk'
      }
    },
    documentation: 'https://github.com/10xdev/api-docs'
  })
})

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: '/api'
  })
})

export { router as apiRoutes }