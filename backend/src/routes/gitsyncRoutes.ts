// ============================================
// GITSYNC ROUTES
// ============================================
// Definição das rotas da API do gitsync:
// - OAuth flow
// - Conexões (CRUD)
// - Repositórios
// - Mapeamentos de arquivos
// - Sincronização
// - Webhooks
// Base path: /api/gitsync

import { Router } from 'express'
import { gitHubSyncController } from '@/controllers/GitHubSyncController'
import { authenticate } from '@/middleware/authenticate'

const router = Router()

// ============================================
// OAUTH ROUTES
// Fluxo de autorização OAuth com o GitHub
// ============================================

// GET /api/gitsync/oauth/authorize
// Gera URL de autorização OAuth
router.get('/oauth/authorize', gitHubSyncController.getAuthorizationUrl.bind(gitHubSyncController))

// GET /api/gitsync/oauth/callback
// Callback do GitHub após autorização
router.get('/oauth/callback', gitHubSyncController.handleOAuthCallback.bind(gitHubSyncController))

// POST /api/gitsync/oauth/disconnect
// Desconecta a conta GitHub do usuário
router.post('/oauth/disconnect', authenticate, gitHubSyncController.disconnect.bind(gitHubSyncController))

// ============================================
// CONNECTION ROUTES
// Gerenciamento de conexões entre projetos e repositórios
// ============================================

// GET /api/gitsync/connections
// Lista conexões de um projeto (query: project_id)
router.get('/connections', gitHubSyncController.getConnections.bind(gitHubSyncController))

// POST /api/gitsync/connections
// Cria nova conexão
router.post('/connections', authenticate, gitHubSyncController.createConnection.bind(gitHubSyncController))

// DELETE /api/gitsync/connections/:id
// Remove uma conexão
router.delete('/connections/:id', authenticate, gitHubSyncController.deleteConnection.bind(gitHubSyncController))

// ============================================
// REPO ROUTES
// Listagem de repositórios do usuário
// ============================================

// GET /api/gitsync/repos
// Lista repositórios do usuário autenticado
router.get('/repos', authenticate, gitHubSyncController.getUserRepos.bind(gitHubSyncController))

// ============================================
// FILE MAPPING ROUTES
// Vinculação de arquivos a cards
// ============================================

// POST /api/gitsync/card/:cardId/link-file
// Vincula um arquivo a um card
router.post('/card/:cardId/link-file', authenticate, gitHubSyncController.linkFileToCard.bind(gitHubSyncController))

// DELETE /api/gitsync/card/:cardId/link-file/:mappingId
// Remove vinculação de arquivo
router.delete('/card/:cardId/link-file/:mappingId', authenticate, gitHubSyncController.unlinkFileFromCard.bind(gitHubSyncController))

// GET /api/gitsync/card/:cardId/mappings
// Lista arquivos vinculados a um card
router.get('/card/:cardId/mappings', authenticate, gitHubSyncController.getCardMappings.bind(gitHubSyncController))

// ============================================
// SYNC ROUTES
// Sincronização de cards para GitHub
// ============================================

// POST /api/gitsync/card/:cardId/sync-to-github
// Sincroniza card para GitHub (cria PR)
router.post('/card/:cardId/sync-to-github', authenticate, gitHubSyncController.syncCardToGitHub.bind(gitHubSyncController))

// ============================================
// PULL REQUEST ROUTES
// Listagem de Pull Requests
// ============================================

// GET /api/gitsync/connections/:connectionId/pull-requests
// Lista PRs de uma conexão
router.get('/connections/:connectionId/pull-requests', authenticate, gitHubSyncController.getPullRequests.bind(gitHubSyncController))

// GET /api/gitsync/connections/:connectionId/sync-logs
// Lista logs de sincronização
router.get('/connections/:connectionId/sync-logs', authenticate, gitHubSyncController.getSyncLogs.bind(gitHubSyncController))

// ============================================
// WEBHOOK ROUTES
// Recebimento de eventos do GitHub
// ============================================

// POST /api/gitsync/webhooks/github
// Endpoint para webhooks do GitHub (público, usa HMAC validation)
router.post('/webhooks/github', gitHubSyncController.handleWebhook.bind(gitHubSyncController))

// Exporta o router
export { router as gitsyncRoutes }
