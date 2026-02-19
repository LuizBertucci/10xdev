import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'
import path from 'path'

import {
  corsMiddleware,
  errorHandler,
  notFoundHandler,
  uncaughtErrorHandler,
  validateContentType,
  sanitizeInput
} from '@/middleware'

import { apiRoutes } from '@/routes'

const envPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: envPath, override: true })

uncaughtErrorHandler()

const app = express()

// Security
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

// Parsing
app.use(compression())
app.use(express.json({ limit: '10mb', type: 'application/json' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(validateContentType)
app.use(sanitizeInput)

// Logging
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
app.use(morgan(morganFormat))

// Request ID
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substr(2, 9)
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-ID', requestId)
  next()
})

// Timeout
app.use((req, res, next) => {
  const timeoutMs = Number(process.env.RESPONSE_TIMEOUT_MS) || 20000
  res.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(504).json({ success: false, error: 'Timeout' })
    }
  })
  next()
})

// Routes
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

app.use('/api', apiRoutes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Server
const PORT = Number(process.env.PORT) || 3001

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use`)
    process.exit(1)
  }
  console.error('Server error:', err)
  process.exit(1)
})

const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down...`)
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export default app
