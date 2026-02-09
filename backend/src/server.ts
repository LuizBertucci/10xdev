import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'
import path from 'path'

// Import middlewares
import { 
  corsMiddleware,
  errorHandler, 
  notFoundHandler,
  uncaughtErrorHandler,
  validateContentType,
  sanitizeInput
} from '@/middleware'

// Import routes
import { apiRoutes } from '@/routes'

// Import GitSync (used for webhook/callback before express.json)
import { GithubService } from '@/services/githubService'
import { GitSyncService } from '@/services/gitSyncService'

// Configurar variáveis de ambiente - carregar do diretório do backend
// Usar process.cwd() para garantir que leia do diretório onde o processo foi iniciado
const envPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: envPath, override: true })

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

// ================================================
// GITSYNC WEBHOOK & OAUTH CALLBACK
// Registrados ANTES do express.json() para:
// - Webhook: receber raw body para verificacao HMAC
// - OAuth callback: nao requer auth do usuario
// ================================================

// Webhook - recebe raw body para HMAC verification
app.post('/api/gitsync/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string
      if (!signature) {
        res.status(401).json({ success: false, error: 'Assinatura ausente' })
        return
      }

      const rawBody = req.body as Buffer
      if (!GithubService.verifyWebhookSignature(rawBody, signature)) {
        res.status(401).json({ success: false, error: 'Assinatura inválida' })
        return
      }

      const payload = JSON.parse(rawBody.toString('utf8'))
      const event = req.headers['x-github-event'] as string

      console.log(`[GitSync Webhook] Evento: ${event}`)

      // Responder 200 imediatamente e processar em background
      res.status(200).json({ success: true, message: 'Webhook recebido' })

      // Background processing
      setImmediate(async () => {
        try {
          if (event === 'push') {
            await GitSyncService.handleWebhookPush(payload)
          } else if (event === 'installation') {
            await GitSyncService.handleWebhookInstallation(payload)
          }
        } catch (err: any) {
          console.error(`[GitSync Webhook] Erro ao processar ${event}:`, err.message)
        }
      })
    } catch (error: any) {
      console.error('[GitSync Webhook] Erro:', error)
      res.status(500).json({ success: false, error: 'Erro ao processar webhook' })
    }
  }
)

// OAuth callback - sem auth do usuario (recebe code do GitHub)
const handleGitSyncCallback = async (req: express.Request, res: express.Response) => {
  try {
    const { code, installation_id } = req.query as { code?: string; installation_id?: string }

    if (!code) {
      res.status(400).json({ success: false, error: 'Código de autorização não recebido' })
      return
    }

    const tokenData = await GithubService.exchangeCodeForToken(code)

    // Redirecionar para o frontend com dados na URL
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000'
    const params = new URLSearchParams({
      access_token: tokenData.access_token,
      ...(installation_id ? { installation_id } : {})
    })

    res.redirect(`${frontendUrl}/import-github-token?${params.toString()}`)
  } catch (error: any) {
    console.error('[GitSync OAuth] Erro:', error)
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000'
    res.redirect(`${frontendUrl}/import-github-token?error=${encodeURIComponent(error.message)}`)
  }
}

app.get('/api/gitsync/callback', handleGitSyncCallback)
app.get('/api/gitsync/oauth/callback', handleGitSyncCallback)

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

// Timeout de resposta para evitar requests pendurados indefinidamente
app.use((req, res, next) => {
  const timeoutMs = Number(process.env.RESPONSE_TIMEOUT_MS) || 20000
  res.setTimeout(timeoutMs, () => {
    const rid = res.getHeader('X-Request-ID') || req.headers['x-request-id']
    console.error(`[timeout] ${req.method} ${req.originalUrl} após ${timeoutMs}ms rid=${String(rid ?? '')}`)
    if (!res.headersSent) {
      res.status(504).json({ success: false, error: 'Timeout: servidor demorou para responder' })
    }
  })
  next()
})

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
// YOUTUBE THUMBNAIL PROXY
// ================================================

// Rota para proxy de thumbnails do YouTube
app.get('/api/youtube-thumbnail/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params
    const thumbnailUrls = [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/default.jpg`
    ]

    for (const url of thumbnailUrls) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          const buffer = await response.arrayBuffer()
          res.set('Content-Type', 'image/jpeg')
          res.set('Cache-Control', 'public, max-age=3600')
          res.send(Buffer.from(buffer))
          return
        }
      } catch (error) {
        continue
      }
    }
    res.status(404).json({ error: 'Thumbnail not found' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

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

const PORT = Number(process.env.PORT) || 3001
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
   • Database: Supabase PostgreSQL
   
⏰ Timestamp: ${new Date().toISOString()}
  `)
})

// Listener para erros do servidor (ex.: porta em uso)
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Porta ${PORT} já está em uso (EADDRINUSE).`)
    console.error(`   - Finalize o processo que está usando a porta ou rode com outra porta.`)
    console.error(`   - Exemplo: PORT=3002 npm run dev`)
    process.exit(1)
  }

  console.error('\n❌ Erro ao iniciar o servidor HTTP:', {
    name: err.name,
    message: err.message,
    code: err.code,
    stack: err.stack,
    timestamp: new Date().toISOString()
  })
  process.exit(1)
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