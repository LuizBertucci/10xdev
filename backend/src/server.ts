import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
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
} from '@/middleware'

// Import routes
import { apiRoutes } from '@/routes'

// Configurar variáveis de ambiente
dotenv.config()

// Configurar handlers de erro não capturados
uncaughtErrorHandler()

// Criar app Express
const app = express()

// ================================================
// SECURITY MIDDLEWARE
// ================================================

// Helmet para headers de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false // Permite embeds se necessário
}))

// CORS
app.use(corsMiddleware)

// Rate limiting geral
app.use(generalRateLimit)

// ================================================
// PARSING MIDDLEWARE
// ================================================

// Compression
app.use(compression())

// Body parsing
app.use(express.json({ 
  limit: '10mb',
  type: 'application/json'
}))
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}))

// Content-Type validation
app.use(validateContentType)

// Input sanitization
app.use(sanitizeInput)

// ================================================
// LOGGING MIDDLEWARE
// ================================================

// Morgan logger
const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined'
  : 'dev'

app.use(morgan(morganFormat))

// Request ID para rastreamento
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substr(2, 9)
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-ID', requestId)
  next()
})

// ================================================
// SPECIFIC RATE LIMITERS
// ================================================

// Rate limiting para operações de escrita
app.use('/api/card-features', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !req.path.includes('bulk')) {
    return writeOperationsRateLimit(req, res, next)
  }
  next()
})

// Rate limiting para bulk operations
app.use('/api/card-features/bulk', bulkOperationsRateLimit)

// Rate limiting para search
app.use('/api/card-features/search', searchRateLimit)

// Rate limiting para stats
app.use('/api/card-features/stats', statsRateLimit)

// ================================================
// ROUTES
// ================================================

// Health check simples na raiz
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

// API routes
app.use('/api', apiRoutes)

// ================================================
// ERROR HANDLING
// ================================================

// 404 handler para rotas não encontradas
app.use(notFoundHandler)

// Error handler global
app.use(errorHandler)

// ================================================
// SERVER STARTUP
// ================================================

const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

const server = app.listen(PORT, () => {
  console.log(`
🚀 Servidor iniciado com sucesso!

📊 Informações:
   • Porta: ${PORT}
   • Ambiente: ${NODE_ENV}
   • URL: http://localhost:${PORT}
   
📚 Endpoints principais:
   • API Info: http://localhost:${PORT}/api
   • Health: http://localhost:${PORT}/api/health
   • CardFeatures: http://localhost:${PORT}/api/card-features
   
🔧 Configurações:
   • CORS: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}
   • Rate Limit: ${process.env.RATE_LIMIT_MAX_REQUESTS || '100'} req/15min
   • Database: Supabase PostgreSQL
   
⏰ Timestamp: ${new Date().toISOString()}
  `)
})

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Recebido sinal ${signal}. Iniciando graceful shutdown...`)
  
  server.close(() => {
    console.log('✅ Servidor HTTP fechado.')
    
    // Aqui você pode fechar conexões com banco de dados, etc.
    console.log('✅ Todas as conexões foram fechadas.')
    process.exit(0)
  })
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forçando encerramento após timeout.')
    process.exit(1)
  }, 10000)
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export default app