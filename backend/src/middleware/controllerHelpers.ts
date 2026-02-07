import { Request, Response } from 'express'

type AsyncHandler = (req: Request, res: Response) => Promise<void>

/** Erro com status HTTP para lancar dentro de handlers. */
class HttpError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

/** Cria HttpError 400 (bad request). */
export const badRequest = (msg: string) => new HttpError(400, msg)

/** Mapeia mensagem de erro para status HTTP quando o erro nao traz statusCode. */
export function mapErrorStatus(msg?: string): number {
  if (!msg) return 500
  const lower = msg.toLowerCase()
  if (lower.includes('não encontrado') || lower.includes('404')) return 404
  if (lower.includes('não autorizado') || lower.includes('autenticado')) return 401
  if (lower.includes('permissão') || lower.includes('proibido')) return 403
  if (lower.includes('já existe') || lower.includes('duplicad')) return 409
  if (lower.includes('rate') || lower.includes('limite')) return 429
  if (lower.includes('timeout')) return 504
  return 500
}

/** Wraps handler com try/catch + mapeamento automatico de status HTTP.
 *  Erros com .statusCode usam esse valor; demais sao mapeados via mensagem. */
export const safeHandler = (fn: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await fn(req, res)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno'
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
      ? error.statusCode
      : mapErrorStatus(error instanceof Error ? error.message : undefined)
    res.status(statusCode).json({ success: false, error: errorMessage })
  }
}

/** Extrai e valida req.params[paramName]. Lanca 400 se ausente. */
export function requireId(req: Request, paramName = 'id'): string {
  const id = req.params[paramName]
  if (!id) throw badRequest(`Parâmetro "${paramName}" é obrigatório`)
  return id
}

/** Se result.success === false, lanca HttpError com statusCode e mensagem. */
export function assertResult(result: { success: boolean; error?: string; statusCode?: number }): void {
  if (!result.success) {
    throw new HttpError(result.statusCode || 400, result.error || 'Erro')
  }
}

/** Envia ModelResult como resposta JSON padronizada. */
export function respond<T = unknown>(
  res: Response,
  result: { success: boolean; data?: T; error?: string; statusCode?: number },
  msg?: string,
  status = 200
): void {
  if (!result.success) {
    res.status(result.statusCode || 400).json({ success: false, error: result.error })
    return
  }
  res.status(status).json({
    success: true,
    ...(result.data !== undefined ? { data: result.data } : {}),
    ...(msg ? { message: msg } : {})
  })
}

/** Envia ModelListResult como resposta JSON com count. */
export function respondList<T = unknown>(
  res: Response,
  result: { success: boolean; data?: T[]; count?: number; error?: string; statusCode?: number }
): void {
  if (!result.success) {
    res.status(result.statusCode || 400).json({ success: false, error: result.error })
    return
  }
  res.json({ success: true, data: result.data, count: result.count })
}

/** Valida e parseia query params de paginacao (page, limit, sortBy, sortOrder, search). */
export function parsePagination(query: Record<string, unknown>): {
  page: number
  limit: number
  search?: string
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
} {
  const page = query.page ? Number(query.page) : 1
  const limit = query.limit ? Number(query.limit) : 10

  if (!Number.isInteger(page) || page <= 0) throw badRequest('Parâmetro "page" deve ser um número inteiro maior que zero')
  if (!Number.isInteger(limit) || limit <= 0) throw badRequest('Parâmetro "limit" deve ser um número inteiro maior que zero')

  const allowedSortBy = ['name', 'created_at', 'updated_at'] as const
  let sortBy: 'name' | 'created_at' | 'updated_at' | undefined
  if (typeof query.sortBy === 'string') {
    if (!(allowedSortBy as readonly string[]).includes(query.sortBy)) throw badRequest('Parâmetro "sortBy" inválido')
    sortBy = query.sortBy as 'name' | 'created_at' | 'updated_at'
  }

  let sortOrder: 'asc' | 'desc' | undefined
  if (typeof query.sortOrder === 'string') {
    const val = query.sortOrder.toLowerCase()
    if (val !== 'asc' && val !== 'desc') throw badRequest('Parâmetro "sortOrder" deve ser "asc" ou "desc"')
    sortOrder = val as 'asc' | 'desc'
  }

  return {
    page,
    limit,
    ...(typeof query.search === 'string' ? { search: query.search } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortOrder ? { sortOrder } : {})
  }
}

/** Valida e parseia limit/offset opcionais para paginacao de cards. */
export function parseCardPagination(query: Record<string, unknown>): { limit?: number; offset?: number } {
  const result: { limit?: number; offset?: number } = {}

  if (query.limit) {
    const limit = Number(query.limit)
    if (!Number.isInteger(limit) || limit <= 0) throw badRequest('Parâmetro "limit" deve ser um número inteiro maior que zero')
    result.limit = limit
  }

  if (query.offset) {
    const offset = Number(query.offset)
    if (!Number.isInteger(offset) || offset < 0) throw badRequest('Parâmetro "offset" deve ser um número inteiro maior ou igual a zero')
    result.offset = offset
  }

  return result
}
