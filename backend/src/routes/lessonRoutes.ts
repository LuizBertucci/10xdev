import { Router } from 'express'
import LessonController from '../controllers/LessonController'
import { verifyUser, requireAdmin, optionalAuth, authRateLimit } from '../middleware/auth'

const router = Router()

/**
 * LESSON ROUTES - Sistema de Gerenciamento de Aulas
 * 
 * Rotas públicas:
 * - GET /api/lessons - Listar aulas (com filtros)
 * - GET /api/lessons/:id - Obter aula específica
 * - GET /api/lessons/categories - Obter categorias
 * 
 * Rotas de admin:
 * - POST /api/lessons - Criar aula
 * - PUT /api/lessons/:id - Atualizar aula
 * - DELETE /api/lessons/:id - Deletar aula
 * - GET /api/lessons/stats - Estatísticas
 */

// ================================================
// ROTAS PÚBLICAS
// ================================================

/**
 * LISTAR AULAS
 * GET /api/lessons
 * 
 * Query params:
 * - category: string (filtrar por categoria)
 * - difficulty: 'beginner'|'intermediate'|'advanced' 
 * - is_free: boolean (filtrar aulas gratuitas/pagas)
 * - search: string (buscar por título/descrição)
 * - tags: string (tags separadas por vírgula)
 * - limit: number (itens por página, padrão 20)
 * - offset: number (offset para paginação, padrão 0)
 */
router.get('/', 
  optionalAuth, // Autenticação opcional para mostrar diferentes conteúdos baseado no usuário
  LessonController.getLessons.bind(LessonController)
)

/**
 * OBTER AULA POR ID
 * GET /api/lessons/:id
 */
router.get('/:id',
  optionalAuth,
  LessonController.getLessonById.bind(LessonController)
)

/**
 * OBTER CATEGORIAS DISPONÍVEIS
 * GET /api/lessons/categories
 */
router.get('/meta/categories',
  LessonController.getCategories.bind(LessonController)
)

// ================================================
// ROTAS DE ADMIN
// ================================================

/**
 * CRIAR NOVA AULA
 * POST /api/lessons
 * 
 * Body: {
 *   title: string,
 *   description: string,
 *   video_url: string,
 *   thumbnail_url?: string,
 *   duration?: number,
 *   order_index?: number,
 *   category: string,
 *   difficulty: 'beginner'|'intermediate'|'advanced',
 *   tags?: string[],
 *   is_free?: boolean,
 *   content?: string
 * }
 */
router.post('/',
  verifyUser,
  requireAdmin,
  authRateLimit(10), // Máximo 10 criações de aulas por 15 min
  LessonController.createLesson.bind(LessonController)
)

/**
 * ATUALIZAR AULA
 * PUT /api/lessons/:id
 * 
 * Body: UpdateLessonData (campos opcionais)
 */
router.put('/:id',
  verifyUser,
  requireAdmin,
  authRateLimit(20), // Máximo 20 atualizações por 15 min
  LessonController.updateLesson.bind(LessonController)
)

/**
 * DELETAR AULA
 * DELETE /api/lessons/:id
 */
router.delete('/:id',
  verifyUser,
  requireAdmin,
  authRateLimit(5), // Máximo 5 exclusões por 15 min
  LessonController.deleteLesson.bind(LessonController)
)

/**
 * ESTATÍSTICAS DAS AULAS
 * GET /api/lessons/stats
 * 
 * Retorna:
 * - total: number
 * - free: number  
 * - premium: number
 * - totalDuration: number (em segundos)
 * - difficultyStats: object
 * - categoryStats: object
 */
router.get('/meta/stats',
  verifyUser,
  requireAdmin,
  LessonController.getLessonStats.bind(LessonController)
)

export default router