import { Request, Response, NextFunction } from 'express'
import { SupabaseAuthAdapter } from '../adapters/SupabaseAuthAdapter'

const adapter = new SupabaseAuthAdapter()

/**
 * Middleware to validate Supabase JWT tokens
 */
export async function supabaseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de acesso requerido'
      })
    }

    const token = authHeader.substring(7)

    // Verify token using Supabase
    const user = await adapter.verifyToken(token)

    // Attach user to request
    ;(req as any).user = user

    next()
  } catch (error: any) {
    console.error('Middleware authentication error:', error)
    return res.status(401).json({
      error: 'Token inválido ou expirado'
    })
  }
}
