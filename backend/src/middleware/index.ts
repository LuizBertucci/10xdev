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
export { supabaseMiddleware, optionalAuth } from './supabaseMiddleware'
export { authenticate } from './authenticate'
export { requireAdmin } from './requireAdmin'
export {
  safeHandler,
  badRequest,
  requireId,
  assertResult,
  respond,
  respondList,
  parsePagination,
  parseCardPagination,
  mapErrorStatus
} from './controllerHelpers'