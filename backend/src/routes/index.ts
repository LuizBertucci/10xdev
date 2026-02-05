import { Router } from 'express'
import { cardFeatureRoutes } from './cardFeatureRoutes'
import { authRoutes } from './authRoutes'
import { contentRoutes } from './contentRoutes'
import { projectRoutes } from './projectRoutes'
import { userRoutes } from './userRoutes'
import { adminRoutes } from './adminRoutes'
import { templateRoutes } from './templateRoutes'
import { gitsyncRoutes } from './gitsyncRoutes'

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

// Contents routes
router.use('/contents', contentRoutes)

// Projects routes
router.use('/projects', projectRoutes)

// Templates routes
router.use('/templates', templateRoutes)

// Users routes
router.use('/users', userRoutes)

// Admin routes
router.use('/admin', adminRoutes)

// GitHub Sync routes
router.use('/gitsync', gitsyncRoutes)

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
      contents: {
        list: 'GET /api/contents',
        getById: 'GET /api/contents/:id',
        create: 'POST /api/contents (admin)',
        update: 'PUT /api/contents/:id (admin)',
        delete: 'DELETE /api/contents/:id (admin)',
        updateCardFeature: 'PATCH /api/contents/:id/card-feature (admin)'
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
      templates: {
        list: 'GET /api/templates',
        getById: 'GET /api/templates/:id',
        create: 'POST /api/templates (admin)'
      },
      users: {
        search: 'GET /api/users/search?q=term'
      },
      gitsync: {
        oauthAuthorize: 'GET /api/gitsync/oauth/authorize?project_id={id}',
        oauthCallback: 'GET /api/gitsync/oauth/callback',
        oauthDisconnect: 'POST /api/gitsync/oauth/disconnect',
        connections: {
          list: 'GET /api/gitsync/connections?project_id={id}',
          create: 'POST /api/gitsync/connections',
          delete: 'DELETE /api/gitsync/connections/:id'
        },
        repos: {
          list: 'GET /api/gitsync/repos'
        },
        mappings: {
          linkFile: 'POST /api/gitsync/card/:cardId/link-file',
          unlinkFile: 'DELETE /api/gitsync/card/:cardId/link-file/:mappingId',
          listByCard: 'GET /api/gitsync/card/:cardId/mappings'
        },
        sync: {
          cardToGithub: 'POST /api/gitsync/card/:cardId/sync-to-github'
        },
        pullRequests: {
          list: 'GET /api/gitsync/connections/:connectionId/pull-requests'
        },
        logs: {
          list: 'GET /api/gitsync/connections/:connectionId/sync-logs'
        },
        webhook: {
          github: 'POST /api/gitsync/webhooks/github'
        }
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
