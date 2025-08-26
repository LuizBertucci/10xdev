// ================================================
// PAGINATION UTILITIES - Shared pagination functions
// ================================================

import { Request } from 'express'
import type { CardFeatureQueryParams } from '../types/cardfeature'

/**
 * Extract and validate pagination parameters from request
 */
export function extractPaginationParams(req: Request) {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10
  return { page, limit }
}

/**
 * Build complete query parameters object from request
 */
export function buildQueryParams(req: Request, extraParams: Partial<CardFeatureQueryParams> = {}): CardFeatureQueryParams {
  const { page, limit } = extractPaginationParams(req)
  
  return {
    page,
    limit,
    ...(req.query.tech && { tech: req.query.tech as string }),
    ...(req.query.language && { language: req.query.language as string }),
    ...(req.query.search && { search: req.query.search as string }),
    ...(req.query.sortBy && { sortBy: req.query.sortBy as any }),
    ...(req.query.sortOrder && { sortOrder: req.query.sortOrder as any }),
    ...extraParams
  }
}

/**
 * Build paginated response object
 */
export function buildPaginatedResponse(result: any, params: CardFeatureQueryParams, extraData: any = {}) {
  const totalPages = params.limit ? Math.ceil((result.count || 0) / params.limit) : 1
  const currentPage = params.page || 1

  return {
    success: true,
    data: result.data,
    count: result.count,
    totalPages,
    currentPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    ...extraData
  }
}