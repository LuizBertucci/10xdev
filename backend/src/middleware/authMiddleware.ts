import { Request, Response, NextFunction } from 'express'
import { supabase } from '../database/supabase'
import type { User } from '@supabase/supabase-js'

/**
 * Interface estendida do Request com usuário e token
 */
export interface AuthRequest extends Request {
  user?: User
  token?: string
}

/**
 * Middleware para verificar JWT do Supabase
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticação não fornecido'
      })
    }

    const token = authHeader.substring(7)

    // Verifica o token diretamente com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        error: 'Token inválido ou expirado'
      })
    }

    // Adiciona o usuário e token ao request
    req.user = user
    req.token = token

    next()
  } catch (error) {
    console.error('Erro na autenticação:', error)
    return res.status(500).json({
      error: 'Erro ao validar autenticação'
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
      const token = authHeader.substring(7)
      const { data: { user } } = await supabase.auth.getUser(token)

      if (user) {
        req.user = user
        req.token = token
      }
    }

    next()
  } catch (error) {
    next()
  }
}
