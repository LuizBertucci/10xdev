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

type OAuthStateData = {
  origin?: string
  projectId?: string
  nonce?: string
}

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
// GITHUB WEBHOOK & OAUTH CALLBACK
// Registrados ANTES do express.json() para:
// - Webhook: receber raw body para verificacao HMAC
// - OAuth callback: nao requer auth do usuario
// ================================================

// Webhook - recebe raw body para HMAC verification
app.post('/api/github/webhook',
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
            await GithubService.handleWebhookPush(payload)
          } else if (event === 'installation') {
            await GithubService.handleWebhookInstallation(payload)
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          console.error(`[GitSync Webhook] Erro ao processar ${event}:`, message)
        }
      })
    } catch (error: unknown) {
      console.error('[GitSync Webhook] Erro:', error)
      res.status(500).json({ success: false, error: 'Erro ao processar webhook' })
    }
  }
)

// GitHub App install callback - sem auth do usuario
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000'

const parseStateParameter = (state?: string): OAuthStateData => {
  if (!state) return {}

  try {
    const decoded = Buffer.from(state, 'base64').toString('utf-8')

    try {
      const parsed = JSON.parse(decoded)
      if (!parsed || typeof parsed !== 'object') return {}

      const origin = typeof parsed.origin === 'string' ? parsed.origin : undefined
      const projectId = typeof parsed.projectId === 'string' ? parsed.projectId : undefined
      const nonce = typeof parsed.nonce === 'string' ? parsed.nonce : undefined
      return { origin, projectId, nonce }
    } catch {
      // Retrocompatibilidade: state antigo codificado só com origin em texto.
      return { origin: decoded }
    }
  } catch {
    return {}
  }
}

const normalizeOrigin = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    return new URL(trimmed).origin
  } catch {
    return null
  }
}

const getValidatedFrontendUrl = (stateOrigin?: string): string => {
  const allowedOrigins = (process.env.CORS_ORIGIN || DEFAULT_FRONTEND_ORIGIN)
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin))

  const fallbackOrigin = allowedOrigins[0] || DEFAULT_FRONTEND_ORIGIN
  const candidateOrigin = stateOrigin ? normalizeOrigin(stateOrigin) : null

  if (candidateOrigin && allowedOrigins.includes(candidateOrigin)) {
    return candidateOrigin
  }

  return fallbackOrigin
}

const buildGithubInstallReturnUrl = ({
  frontendUrl,
  projectId,
  installationId,
  state,
  error
}: {
  frontendUrl: string
  projectId?: string
  installationId?: string
  state?: string
  error?: string
}): string => {
  const pathname = projectId ? `/projects/${projectId}` : '/projects'
  const params = new URLSearchParams({
    github_sync: 'true',
    ...(projectId ? {} : { open_project_form: 'true' }),
    ...(installationId ? { installation_id: installationId } : {}),
    ...(state ? { state } : {}),
    ...(error ? { github_sync_error: error } : {})
  })

  return `${frontendUrl}${pathname}?${params.toString()}`
}

const handleGitSyncCallback = async (req: express.Request, res: express.Response) => {
  try {
    const { installation_id, setup_action, state } = req.query as {
      installation_id?: string
      setup_action?: string
      state?: string
    }

    const { origin, projectId } = parseStateParameter(state)
    const frontendUrl = getValidatedFrontendUrl(origin)

    if (setup_action && setup_action !== 'install') {
      throw new Error('A instalação do GitHub não foi concluída.')
    }

    if (!installation_id) {
      throw new Error('Installation ID não recebido do GitHub.')
    }

    res.redirect(buildGithubInstallReturnUrl({
      frontendUrl,
      ...(projectId ? { projectId } : {}),
      installationId: installation_id,
      ...(state ? { state } : {})
    }))
  } catch (error: unknown) {
    console.error('[GitSync Install] Erro:', error)

    const { state } = req.query as { state?: string }
    const { origin, projectId } = parseStateParameter(state)
    const frontendUrl = getValidatedFrontendUrl(origin)

    const message = error instanceof Error ? error.message : 'Erro ao processar instalação do GitHub'

    res.redirect(buildGithubInstallReturnUrl({
      frontendUrl,
      ...(projectId ? { projectId } : {}),
      ...(state ? { state } : {}),
      error: message
    }))
  }
}

app.get('/api/github/callback', handleGitSyncCallback)
app.get('/api/github/oauth/callback', handleGitSyncCallback)

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
  const requestId = Math.random().toString(36).substring(2, 11)
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-ID', requestId)
  next()
})

// Timeout de resposta para evitar requests pendurados indefinidamente
app.use((req, res, next) => {
  const isGitSyncConnect = req.method === 'POST' && /\/api\/projects\/[^/]+\/github\/connect$/.test(req.originalUrl)
  const defaultTimeoutMs = Number(process.env.RESPONSE_TIMEOUT_MS) || 20000
  const connectTimeoutMs = Number(process.env.GITHUB_CONNECT_TIMEOUT_MS) || Number(process.env.GITSYNC_CONNECT_TIMEOUT_MS) || 180000
  const timeoutMs = isGitSyncConnect ? connectTimeoutMs : defaultTimeoutMs
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
app.get('/', (_req, res) => {
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