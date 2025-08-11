import { Router } from 'express'
import { cardFeatureRoutes } from './cardFeatureRoutes'
import youtubeRoutes from './youtubeRoutes'
import authRoutes from './authRoutes'
// import lessonRoutes from './lessonRoutes'

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

// CardFeatures routes
router.use('/card-features', cardFeatureRoutes)

// YouTube routes - API Premium para análise de playlists
router.use('/youtube', youtubeRoutes)

// Authentication routes - Sistema JWT completo
router.use('/auth', authRoutes)

// Lessons routes - Sistema de gerenciamento de aulas (temporariamente desabilitado)
// router.use('/lessons', lessonRoutes)

// API Info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '10xDev Backend API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
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
      youtube: {
        playlistInfo: 'GET /api/youtube/playlist/:playlistId',
        status: 'GET /api/youtube/status',
        clearCache: 'DELETE /api/youtube/cache'
      },
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        refresh: 'POST /api/auth/refresh',
        profile: 'GET /api/auth/me',
        validate: 'POST /api/auth/validate',
        status: 'GET /api/auth/status'
      },
      // lessons: {
      //   list: 'GET /api/lessons',
      //   getById: 'GET /api/lessons/:id',
      //   create: 'POST /api/lessons (Admin)',
      //   update: 'PUT /api/lessons/:id (Admin)',
      //   delete: 'DELETE /api/lessons/:id (Admin)',
      //   categories: 'GET /api/lessons/meta/categories',
      //   stats: 'GET /api/lessons/meta/stats (Admin)'
      // }
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