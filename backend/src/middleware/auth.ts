import { Request, Response, NextFunction } from 'express'
import UserModel from '../models/UserModel'
import JWTBlacklistModel from '../models/JWTBlacklistModel'

/**
 * MIDDLEWARE DE AUTENTICAÇÃO JWT
 * 
 * Funcionalidades:
 * - Extração e validação de tokens JWT
 * - Verificação de blacklist
 * - Verificação de expiração
 * - Injeção de dados do usuário na request
 * - Tratamento de erros padronizado
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
    email_verified: boolean
  }
  token?: string
}

/**
 * MIDDLEWARE PRINCIPAL - Autenticação obrigatória
 * Usado em rotas que requerem autenticação
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req)
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token de acesso é obrigatório',
        code: 'MISSING_TOKEN'
      })
      return
    }

    // Verificar se o token está na blacklist
    const isBlacklisted = await JWTBlacklistModel.isBlacklisted(token)
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: 'Token inválido ou revogado',
        code: 'TOKEN_BLACKLISTED'
      })
      return
    }

    // Verificar validade do token
    const tokenPayload = UserModel.verifyAccessToken(token)
    if (!tokenPayload) {
      res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN'
      })
      return
    }

    // Verificar se o usuário ainda existe
    const user = await UserModel.findById(tokenPayload.id)
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      })
      return
    }

    // Injetar dados do usuário na request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified
    }
    req.token = token

    console.log(`🔐 [Auth] Usuário autenticado: ${user.email}`)
    next()

  } catch (error: any) {
    console.error('❌ [Auth Middleware] Erro:', error.message)
    res.status(500).json({
      success: false,
      error: 'Erro interno de autenticação',
      code: 'AUTH_INTERNAL_ERROR'
    })
  }
}

/**
 * MIDDLEWARE OPCIONAL - Autenticação não obrigatória
 * Usado em rotas que podem funcionar com ou sem autenticação
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req)
    
    if (!token) {
      // Sem token, continuar sem autenticação
      next()
      return
    }

    // Verificar se o token está na blacklist
    const isBlacklisted = await JWTBlacklistModel.isBlacklisted(token)
    if (isBlacklisted) {
      // Token inválido, continuar sem autenticação
      next()
      return
    }

    // Verificar validade do token
    const tokenPayload = UserModel.verifyAccessToken(token)
    if (!tokenPayload) {
      // Token inválido, continuar sem autenticação
      next()
      return
    }

    // Verificar se o usuário ainda existe
    const user = await UserModel.findById(tokenPayload.id)
    if (!user) {
      // Usuário não existe, continuar sem autenticação
      next()
      return
    }

    // Injetar dados do usuário na request se válido
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified
    }
    req.token = token

    console.log(`🔐 [Optional Auth] Usuário autenticado: ${user.email}`)
    next()

  } catch (error: any) {
    console.error('⚠️ [Optional Auth] Erro ignorado:', error.message)
    // Em caso de erro, continuar sem autenticação
    next()
  }
}

/**
 * MIDDLEWARE DE VERIFICAÇÃO DE EMAIL
 * Requer que o usuário tenha o email verificado
 */
export const requireEmailVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Autenticação necessária',
      code: 'NOT_AUTHENTICATED'
    })
    return
  }

  if (!req.user.email_verified) {
    res.status(403).json({
      success: false,
      error: 'Email não verificado. Verifique seu email para continuar.',
      code: 'EMAIL_NOT_VERIFIED'
    })
    return
  }

  next()
}

/**
 * MIDDLEWARE VERIFY_USER - Padrão da documentação
 * Equivalente ao before_action :verify_user do Rails
 * Redireciona para página inicial se não autenticado
 */
export const verifyUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req)
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Acesso negado. Faça login para continuar.',
        code: 'USER_NOT_AUTHENTICATED',
        redirect: '/login'
      })
      return
    }

    // Verificar se o token está na blacklist
    const isBlacklisted = await JWTBlacklistModel.isBlacklisted(token)
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: 'Sessão expirada. Faça login novamente.',
        code: 'TOKEN_BLACKLISTED',
        redirect: '/login'
      })
      return
    }

    // Verificar validade do token
    const tokenPayload = UserModel.verifyAccessToken(token)
    if (!tokenPayload) {
      res.status(401).json({
        success: false,
        error: 'Sessão inválida. Faça login novamente.',
        code: 'INVALID_TOKEN',
        redirect: '/login'
      })
      return
    }

    // Verificar se o usuário ainda existe
    const user = await UserModel.findById(tokenPayload.id)
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não encontrado. Faça login novamente.',
        code: 'USER_NOT_FOUND',
        redirect: '/login'
      })
      return
    }

    // Injetar dados do usuário na request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified
    }
    req.token = token

    console.log(`✅ [verify_user] Usuário verificado: ${user.email}`)
    next()

  } catch (error: any) {
    console.error('❌ [verify_user] Erro:', error.message)
    res.status(500).json({
      success: false,
      error: 'Erro interno. Tente novamente.',
      code: 'VERIFY_USER_ERROR',
      redirect: '/login'
    })
  }
}

/**
 * MIDDLEWARE DE ADMIN (para implementação futura)
 * Requer que o usuário tenha privilégios de administrador
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Autenticação necessária',
        code: 'NOT_AUTHENTICATED'
      })
      return
    }

    // Verificar se o usuário é admin
    const user = await UserModel.findById(req.user.id)
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      })
      return
    }

    // Por enquanto, considerar admin apenas usuários específicos
    const adminEmails = [
      'admin@10xdev.com',
      'samuel@10xdev.com'
    ]

    if (!adminEmails.includes(user.email)) {
      res.status(403).json({
        success: false,
        error: 'Privilégios de administrador necessários',
        code: 'ADMIN_REQUIRED'
      })
      return
    }

    console.log(`👑 [Admin Auth] Admin autenticado: ${user.email}`)
    next()

  } catch (error: any) {
    console.error('❌ [Admin Auth] Erro:', error.message)
    res.status(500).json({
      success: false,
      error: 'Erro interno de autenticação',
      code: 'AUTH_INTERNAL_ERROR'
    })
  }
}

/**
 * MIDDLEWARE DE RATE LIMITING PARA AUTENTICAÇÃO
 * Implementa rate limiting específico para endpoints de auth
 */
export const authRateLimit = (maxAttempts: number = 5) => {
  const attempts = new Map<string, { count: number, resetTime: number }>()
  const WINDOW_MS = 15 * 60 * 1000 // 15 minutos

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
    const now = Date.now()

    // Limpar entradas expiradas
    for (const [ip, data] of attempts.entries()) {
      if (now > data.resetTime) {
        attempts.delete(ip)
      }
    }

    // Verificar tentativas do cliente atual
    const clientAttempts = attempts.get(clientIP)
    
    if (!clientAttempts) {
      // Primeira tentativa
      attempts.set(clientIP, {
        count: 1,
        resetTime: now + WINDOW_MS
      })
    } else {
      // Verificar se excedeu o limite
      if (clientAttempts.count >= maxAttempts) {
        const remainingTime = Math.ceil((clientAttempts.resetTime - now) / 1000 / 60)
        res.status(429).json({
          success: false,
          error: `Muitas tentativas. Tente novamente em ${remainingTime} minutos.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: remainingTime
        })
        return
      }

      // Incrementar contador
      clientAttempts.count++
    }

    next()
  }
}

/**
 * UTILITÁRIOS
 */

/**
 * Extrai token do header Authorization
 */
function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return null
  }

  // Formato esperado: "Bearer TOKEN"
  if (!authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7) // Remove "Bearer "
  return token.trim() || null
}

/**
 * Middleware para log de tentativas de autenticação
 */
export const logAuthAttempt = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.json

  res.json = function(data: any) {
    const clientIP = req.ip || 'unknown'
    const userAgent = req.get('User-Agent') || 'unknown'
    const endpoint = req.path
    const method = req.method
    const success = data?.success || false

    console.log(`🔍 [Auth Log] ${method} ${endpoint} - IP: ${clientIP} - Success: ${success} - UA: ${userAgent}`)

    return originalSend.call(this, data)
  }

  next()
}

export default {
  authenticateToken,
  optionalAuth,
  requireEmailVerification,
  verifyUser,
  requireAdmin,
  authRateLimit,
  logAuthAttempt
}