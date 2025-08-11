import { Router } from 'express'
import YouTubeController from '../controllers/YouTubeController'
import { verifyUser, requireAdmin } from '../middleware/auth'

const router = Router()

/**
 * YOUTUBE ROUTES - API Premium para Análise de Playlists
 * 
 * Sistema profissional de detecção e análise de playlists do YouTube
 * com múltiplas estratégias de extração e cache inteligente.
 */

// ADMIN ONLY ROUTES - before_action :verify_user + require_admin
// GET /api/youtube/playlist/:playlistId
// Obter informações detalhadas de uma playlist (somente admin)
router.get('/playlist/:playlistId', verifyUser, requireAdmin, YouTubeController.getPlaylistInfo.bind(YouTubeController))

// DELETE /api/youtube/cache  
// Limpar cache do sistema (somente admin)
router.delete('/cache', verifyUser, requireAdmin, YouTubeController.clearCache.bind(YouTubeController))

// GET /api/youtube/status
// Status e estatísticas do sistema (somente admin)
router.get('/status', verifyUser, requireAdmin, YouTubeController.getStatus.bind(YouTubeController))

export default router