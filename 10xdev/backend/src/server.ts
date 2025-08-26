import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import crypto from 'crypto'
import dotenv from 'dotenv'

// Import middlewares
import { 
  corsMiddleware, 
  generalRateLimit, 
  writeOperationsRateLimit,
  bulkOperationsRateLimit,
  searchRateLimit,
  statsRateLimit,
  errorHandler, 
  notFoundHandler,
  uncaughtErrorHandler,
  validateContentType,
  sanitizeInput
} from './middleware'

// Import routes
import { apiRoutes } from './routes'

dotenv.config()
uncaughtErrorHandler()
const app = express()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}))

app.use(corsMiddleware)

app.use(generalRateLimit)

app.use(compression())

app.use(express.json({ 
  limit: '10mb',
  type: 'application/json'
}))
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}))

app.use(validateContentType)

app.use(sanitizeInput)

const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined'
  : 'dev'

app.use(morgan(morganFormat))

app.use((req, res, next) => {
  const requestId = crypto.randomUUID().replace(/-/g, '').substring(0, 9)
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-ID', requestId)
  next()
})

app.use('/api/card-features', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !req.path.includes('bulk')) {
    return writeOperationsRateLimit(req, res, next)
  }
  next()
})

app.use('/api/card-features/bulk', bulkOperationsRateLimit)

app.use('/api/card-features/search', searchRateLimit)

app.use('/api/card-features/stats', statsRateLimit)

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 10xDev Backend API está rodando!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      api: '/api',
      health: '/api/health',
      docs: '/api'
    }
  })
})

app.use('/api', apiRoutes)

app.use(notFoundHandler)

app.use(errorHandler)


const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`)
})

const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`)
  
  server.close(() => {
    console.log('HTTP server closed.')
    process.exit(0)
  })
  
  setTimeout(() => {
    console.error('Forcing shutdown after timeout.')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export default app