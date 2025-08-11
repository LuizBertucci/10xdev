import { Router } from 'express'
import AuthController from '../controllers/AuthController'
import { authenticateToken, authRateLimit, logAuthAttempt } from '../middleware/auth'

const router = Router()

/**
 * AUTH ROUTES - Sistema Completo de Autenticação
 * 
 * Endpoints disponíveis:
 * - POST /api/auth/register - Registro de novo usuário
 * - POST /api/auth/login - Login do usuário
 * - POST /api/auth/logout - Logout do usuário
 * - POST /api/auth/refresh - Renovar tokens
 * - GET /api/auth/me - Perfil do usuário autenticado
 * - POST /api/auth/validate - Validar token
 */

// Aplicar middleware de log em todas as rotas de auth
router.use(logAuthAttempt)

/**
 * REGISTRO DE NOVO USUÁRIO
 * POST /api/auth/register
 * 
 * Body: {
 *   email: string,
 *   password: string,
 *   name: string,
 *   avatar_url?: string
 * }
 * 
 * Response: {
 *   success: boolean,
 *   message: string,
 *   data: {
 *     user: User,
 *     accessToken: string,
 *     refreshToken: string
 *   }
 * }
 */
router.post('/register', 
  authRateLimit(3), // Máximo 3 registros por 15 minutos por IP
  AuthController.register.bind(AuthController)
)

/**
 * LOGIN DO USUÁRIO
 * POST /api/auth/login
 * 
 * Body: {
 *   email: string,
 *   password: string
 * }
 * 
 * Response: {
 *   success: boolean,
 *   message: string,
 *   data: {
 *     user: User,
 *     accessToken: string,
 *     refreshToken: string
 *   }
 * }
 */
router.post('/login',
  authRateLimit(5), // Máximo 5 tentativas de login por 15 minutos por IP
  AuthController.login.bind(AuthController)
)

/**
 * LOGOUT DO USUÁRIO
 * POST /api/auth/logout
 * 
 * Headers: {
 *   Authorization: 'Bearer <access_token>'
 * }
 * 
 * Body: {
 *   refreshToken?: string
 * }
 * 
 * Response: {
 *   success: boolean,
 *   message: string
 * }
 */
router.post('/logout',
  AuthController.logout.bind(AuthController) // Não requer authenticateToken pois o middleware faz a validação internamente
)

/**
 * RENOVAR TOKENS
 * POST /api/auth/refresh
 * 
 * Body: {
 *   refreshToken: string
 * }
 * 
 * Response: {
 *   success: boolean,
 *   message: string,
 *   data: {
 *     user: User,
 *     accessToken: string,
 *     refreshToken: string
 *   }
 * }
 */
router.post('/refresh',
  authRateLimit(10), // Máximo 10 refresh por 15 minutos por IP
  AuthController.refresh.bind(AuthController)
)

/**
 * PERFIL DO USUÁRIO AUTENTICADO
 * GET /api/auth/me
 * 
 * Headers: {
 *   Authorization: 'Bearer <access_token>'
 * }
 * 
 * Response: {
 *   success: boolean,
 *   data: {
 *     user: User
 *   }
 * }
 */
router.get('/me',
  authenticateToken, // Requer autenticação
  AuthController.getProfile.bind(AuthController)
)

/**
 * VALIDAR TOKEN
 * POST /api/auth/validate
 * 
 * Body: {
 *   token: string
 * }
 * 
 * Response: {
 *   success: boolean,
 *   valid: boolean,
 *   data?: {
 *     user: User,
 *     exp: number,
 *     iat: number
 *   }
 * }
 */
router.post('/validate',
  authRateLimit(20), // Máximo 20 validações por 15 minutos por IP
  AuthController.validateToken.bind(AuthController)
)

/**
 * ENDPOINT DE STATUS (para testes e monitoramento)
 * GET /api/auth/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema de autenticação online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      logout: 'POST /api/auth/logout',
      refresh: 'POST /api/auth/refresh',
      me: 'GET /api/auth/me',
      validate: 'POST /api/auth/validate'
    }
  })
})

export default router