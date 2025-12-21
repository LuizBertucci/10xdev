// ================================================
// MIDDLEWARE INDEX - Centralized middleware exports
// ================================================

export { corsMiddleware } from './cors'
export { 
  generalRateLimit, 
  writeOperationsRateLimit, 
  bulkOperationsRateLimit, 
  searchRateLimit, 
  statsRateLimit 
} from './rateLimiter'
export { 
  errorHandler, 
  notFoundHandler, 
  asyncErrorHandler, 
  uncaughtErrorHandler,
  validateContentType,
  sanitizeInput
} from './errorHandler'
export { supabaseMiddleware } from './supabaseMiddleware'
export { authenticate } from './authenticate'
export { isAdmin } from './isAdmin'