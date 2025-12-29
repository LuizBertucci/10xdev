import { Router } from 'express'
import { cardFeatureRoutes } from './cardFeatureRoutes'
import { authRoutes } from './authRoutes'
import { videoRoutes } from './videoRoutes'
import { projectRoutes } from './projectRoutes'
import { userRoutes } from './userRoutes'
import { savedItemRoutes } from './savedItemRoutes'

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

// Authentication routes
router.use('/auth', authRoutes)

// CardFeatures routes
router.use('/card-features', cardFeatureRoutes)

// Videos routes
router.use('/videos', videoRoutes)

// Projects routes
router.use('/projects', projectRoutes)

// Users routes
router.use('/users', userRoutes)

// Saved Items routes
router.use('/saved-items', savedItemRoutes)

// API Info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '10xDev Backend API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'DELETE /api/auth/logout',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        deleteAccount: 'DELETE /api/auth/profile'
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
      },
      videos: {
        list: 'GET /api/videos',
        getById: 'GET /api/videos/:id',
        create: 'POST /api/videos',
        update: 'PUT /api/videos/:id',
        delete: 'DELETE /api/videos/:id',
        updateCardFeature: 'PATCH /api/videos/:id/card-feature'
      },
      projects: {
        list: 'GET /api/projects',
        create: 'POST /api/projects',
        getById: 'GET /api/projects/:id',
        update: 'PUT /api/projects/:id',
        delete: 'DELETE /api/projects/:id',
        getMembers: 'GET /api/projects/:id/members',
        addMember: 'POST /api/projects/:id/members',
        updateMember: 'PUT /api/projects/:id/members/:userId',
        removeMember: 'DELETE /api/projects/:id/members/:userId',
        getCards: 'GET /api/projects/:id/cards',
        addCard: 'POST /api/projects/:id/cards',
        removeCard: 'DELETE /api/projects/:id/cards/:cardFeatureId'
      },
      users: {
        search: 'GET /api/users/search?q=term',
        myCards: 'GET /api/users/my-cards',
        changePassword: 'POST /api/users/change-password'
      },
      savedItems: {
        list: 'GET /api/saved-items?type=video|card',
        save: 'POST /api/saved-items',
        unsave: 'DELETE /api/saved-items/:itemType/:itemId',
        check: 'GET /api/saved-items/check/:itemType/:itemId',
        checkMultiple: 'POST /api/saved-items/check-multiple'
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
