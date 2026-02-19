import { Request, Response, NextFunction } from 'express'

/**
 * Middleware responsável por garantir que a requisição possui um usuário autenticado.
 * Assume que `supabaseMiddleware` já validou o token e populou `req.user`.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Usuário não autenticado'
    })
    return
  }

  next()
}

