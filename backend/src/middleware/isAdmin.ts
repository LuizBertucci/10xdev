import { Request, Response, NextFunction } from 'express'

/**
 * Middleware para verificar se o usuário autenticado possui role de administrador
 *
 * IMPORTANTE: Este middleware deve ser usado APÓS o middleware `authenticate`
 * pois depende de `req.user` estar populado.
 *
 * Usuários com role 'admin' OU com emails específicos de administradores
 * (Luiz Bertucci e Augusto Amado) têm acesso autorizado.
 */

// Lista de emails de administradores (hardcoded conforme requisitos)
const ADMIN_EMAILS = [
  'luizbertucci@10xdev.com',
  'augustoamado@10xdev.com',
  'luiz@10xdev.com',
  'augusto@10xdev.com'
]

export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // Verificar se o usuário está autenticado
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Usuário não autenticado'
    })
    return
  }

  // Verificar role do usuário
  const userRole = req.user.role || req.user.user_metadata?.role
  const userEmail = req.user.email?.toLowerCase()

  // Permitir acesso se:
  // 1. Role é 'admin'
  // 2. Email está na lista de administradores
  const isAdminRole = userRole === 'admin'
  const isAdminEmail = userEmail && ADMIN_EMAILS.some(email =>
    userEmail.includes(email.toLowerCase()) ||
    email.toLowerCase().includes(userEmail)
  )

  if (isAdminRole || isAdminEmail) {
    next()
    return
  }

  // Acesso negado
  res.status(403).json({
    success: false,
    error: 'Acesso negado. Apenas administradores podem acessar este recurso.'
  })
}
