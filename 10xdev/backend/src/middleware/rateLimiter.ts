import rateLimit from 'express-rate-limit'

// Rate limiter geral para todas as rotas
export const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests por windowMs
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente mais tarde.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Retorna rate limit info nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita os headers `X-RateLimit-*`
  skipSuccessfulRequests: false, // Conta requests bem-sucedidos
  skipFailedRequests: false, // Conta requests que falharam
})

// Rate limiter mais restrito para operações de escrita (POST, PUT, DELETE)
export const writeOperationsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 operações de escrita por 15 minutos
  message: {
    success: false,
    error: 'Muitas operações de escrita. Tente novamente mais tarde.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Aplica apenas para métodos de escrita
    return !['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)
  }
})

// Rate limiter específico para bulk operations
export const bulkOperationsRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 operações bulk por hora
  message: {
    success: false,
    error: 'Limite de operações em lote excedido. Tente novamente em 1 hora.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter para busca/search
export const searchRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 100, // 100 buscas por 5 minutos
  message: {
    success: false,
    error: 'Muitas buscas. Tente novamente em 5 minutos.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter para estatísticas (endpoints computacionalmente caros)
export const statsRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 20, // 20 requests de stats por 10 minutos
  message: {
    success: false,
    error: 'Muitas consultas de estatísticas. Tente novamente em 10 minutos.',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
})