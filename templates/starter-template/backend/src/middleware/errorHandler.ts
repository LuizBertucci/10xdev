import { Request, Response, NextFunction } from 'express'

interface CustomError extends Error {
  statusCode?: number
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    method: req.method
  })
}

export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const uncaughtErrorHandler = (): void => {
  process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION!', err)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason: any) => {
    console.error('UNHANDLED REJECTION!', reason)
    process.exit(1)
  })
}

export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.is('application/json') && !req.is('multipart/form-data')) {
      res.status(400).json({
        success: false,
        error: 'Content-Type must be application/json or multipart/form-data'
      })
      return
    }
  }
  next()
}

export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj
    if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item))

    const sanitized = { ...obj }
    Object.keys(sanitized).forEach(key => {
      if (key.startsWith('$') || key.includes('__proto__') || key.includes('constructor')) {
        delete sanitized[key]
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeObject(sanitized[key])
      }
    })
    return sanitized
  }

  if (req.body) req.body = sanitizeObject(req.body)
  if (req.query) req.query = sanitizeObject(req.query)
  next()
}
