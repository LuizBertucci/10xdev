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

  // Log simplificado do erro
  console.error('Error:', {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })

  // Mapeamento de erros consolidado
  const errorMappings = [
    { patterns: ['violates', 'JSON'], statusCode: 400, message: 'Dados inválidos' },
    { patterns: ['unauthorized', 'não autorizado'], statusCode: 401 },
    { patterns: ['forbidden', 'proibido'], statusCode: 403 },
    { patterns: ['not found', 'não encontrado'], statusCode: 404 },
    { patterns: ['connect', 'connection'], statusCode: 503, message: 'Erro de conexão' }
  ]

  for (const { patterns, statusCode, message } of errorMappings) {
    if (patterns.some(pattern => err.message?.includes(pattern))) {
      error.statusCode = statusCode
      if (message) error.message = message
      break
    }
  }

  const isDev = process.env.NODE_ENV === 'development'
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Erro interno do servidor',
    ...(isDev && { stack: err.stack, details: error })
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
  const logAndExit = (type: string, error: any) => {
    console.error(`${type} 💥 Shutting down...`, {
      error: error.message || error,
      timestamp: new Date().toISOString()
    })
    process.exit(1)
  }

  process.on('uncaughtException', (err: Error) => logAndExit('UNCAUGHT EXCEPTION!', err))
  process.on('unhandledRejection', (reason: any) => logAndExit('UNHANDLED REJECTION!', reason))
}

// Middleware para validar Content-Type
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return res.status(400).json({
      success: false,
      error: 'Content-Type deve ser application/json'
    })
  }
  next()
}

// Middleware para sanitização básica de input
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const dangerousKeys = ['$', '__proto__', 'constructor']
  
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj
    if (Array.isArray(obj)) return obj.map(sanitizeObject)
    
    const sanitized = { ...obj }
    Object.keys(sanitized).forEach(key => {
      if (dangerousKeys.some(danger => key.startsWith(danger) || key.includes(danger))) {
        delete sanitized[key]
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeObject(sanitized[key])
      }
    })
    return sanitized
  }

  // Sanitiza body e query em uma única operação
  ;['body', 'query'].forEach(prop => {
    if (req[prop]) req[prop] = sanitizeObject(req[prop])
  })
  
  next()
}