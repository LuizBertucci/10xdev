import { Request, Response, NextFunction } from 'express'

/**
 * Middleware para restringir rotas apenas para admins.
 * Requer que `supabaseMiddleware` já tenha populado `req.user`.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Usuário não autenticado' })
    return
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Acesso restrito a administradores' })
    return
  }

  next()
}



