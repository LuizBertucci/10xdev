import { Request, Response, NextFunction } from 'express'
import { supabase } from '../database/supabase'

/**
 * Interface estendida do Request com usuário
 */
export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role?: string
  }
}

/**
 * Middleware para verificar JWT do Supabase
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido'
      })
    }

    const token = authHeader.split(' ')[1]

    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      })
    }

    // Adicionar usuário ao request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role
    }

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Erro na autenticação'
    })
  }
}

/**
 * Middleware opcional de autenticação (não bloqueia se não houver token)
 */
export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await supabase.auth.getUser(token)

      if (user) {
        req.user = {
          id: user.id,
          email: user.email || '',
          role: user.role
        }
      }
    }

    next()
  } catch (error) {
    next()
  }
}
