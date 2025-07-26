import { Request, Response, NextFunction } from 'express'

// Interface para erros customizados
interface CustomError extends Error {
  statusCode?: number
  status?: string
  isOperational?: boolean
}

// Error handler principal
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err }
  error.message = err.message

  // Log do erro (em produção, usar um logger profissional como Winston)
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  })

  // Erro de validação do Supabase
  if (err.message?.includes('violates')) {
    error.message = 'Dados inválidos fornecidos'
    error.statusCode = 400
  }

  // Erro de conexão com banco
  if (err.message?.includes('connect') || err.message?.includes('connection')) {
    error.message = 'Erro de conexão com o banco de dados'
    error.statusCode = 503
  }

  // Erro de syntax JSON
  if (err.message?.includes('JSON')) {
    error.message = 'Formato JSON inválido'
    error.statusCode = 400
  }

  // Erro 404 - Not Found
  if (err.message?.includes('not found') || err.message?.includes('não encontrado')) {
    error.statusCode = 404
  }

  // Erro 401 - Unauthorized
  if (err.message?.includes('unauthorized') || err.message?.includes('não autorizado')) {
    error.statusCode = 401
  }

  // Erro 403 - Forbidden
  if (err.message?.includes('forbidden') || err.message?.includes('proibido')) {
    error.statusCode = 403
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: error
    })
  })
}

// Handler para rotas não encontradas
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Rota ${req.originalUrl} não encontrada`,
    method: req.method,
    timestamp: new Date().toISOString()
  })
}

// Handler para erros assíncronos
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Middleware para capturar erros não tratados
export const uncaughtErrorHandler = (): void => {
  // Captura exceções não tratadas
  process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    })
    process.exit(1)
  })

  // Captura promises rejeitadas não tratadas
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...', {
      reason,
      promise,
      timestamp: new Date().toISOString()
    })
    process.exit(1)
  })
}

// Middleware para validar Content-Type em operações POST/PUT
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.is('application/json')) {
      res.status(400).json({
        success: false,
        error: 'Content-Type deve ser application/json'
      })
      return
    }
  }
  next()
}

// Middleware para sanitização básica de input
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Remove propriedades potencialmente perigosas
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj
    
    // Preservar arrays
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item))
    }
    
    const sanitized = { ...obj }
    
    // Remove propriedades que começam com $ ou contêm __proto__
    Object.keys(sanitized).forEach(key => {
      if (key.startsWith('$') || key.includes('__proto__') || key.includes('constructor')) {
        delete sanitized[key]
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeObject(sanitized[key])
      }
    })
    
    return sanitized
  }

  if (req.body) {
    req.body = sanitizeObject(req.body)
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query)
  }
  
  next()
}