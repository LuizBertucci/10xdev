// ================================================
// API CLIENT - Base HTTP client configuration
// ================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  count?: number
  totalPages?: number
  currentPage?: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export interface ApiError {
  success: false
  error: string
  statusCode?: number
  details?: any
}

const TOKEN_REFRESH_SAFETY_WINDOW_MS = 30_000
const SESSION_CHECK_COOLDOWN_MS = 5_000
let cachedAccessToken: string | null = null
let cachedAccessTokenExpiresAtMs = 0
let lastSessionCheckAtMs = 0
let sessionCheckInProgress: Promise<void> | null = null

function clearTokenCache(): void {
  cachedAccessToken = null
  cachedAccessTokenExpiresAtMs = 0
  lastSessionCheckAtMs = 0
}

class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>
  private requestTimeoutMs: number

  constructor() {
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    this.baseURL = isLocalhost
      ? 'http://localhost:3001/api'
      : (process.env.NEXT_PUBLIC_API_URL || 'https://web-backend-10xdev.azurewebsites.net/api')

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    const envTimeout = typeof process !== 'undefined'
      ? Number((process.env as any)?.NEXT_PUBLIC_API_TIMEOUT_MS)
      : NaN
    this.requestTimeoutMs = Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 15000
  }

  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw {
          success: false,
          error: `Timeout: API não respondeu em ${Math.round(timeoutMs / 1000)}s`,
          statusCode: 408
        } as ApiError
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async handleResponse<T>(response: Response, _silent = false): Promise<ApiResponse<T> | undefined> {
    let data: ApiResponse<T> | undefined
    
    try {
      const text = await response.text()
      if (text) {
        const contentType = response.headers.get('content-type')
        data = contentType?.includes('application/json')
          ? JSON.parse(text) as ApiResponse<T>
          : { success: false, error: text }
      }
    } catch {
      data = { success: false, error: 'Erro ao processar resposta do servidor' }
    }

    if (!response.ok) {
      if (response.status === 401) clearTokenCache()
      
      const errorMessage = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText || 'Erro desconhecido'}`
      throw {
        success: false,
        error: errorMessage,
        statusCode: response.status,
        details: data || { status: response.status, statusText: response.statusText }
      } as ApiError
    }

    return data
  }

  private buildURL(endpoint: string, params?: Record<string, any>): string {
    const baseUrl = this.baseURL.endsWith('/') ? this.baseURL : this.baseURL + '/'
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const url = new URL(cleanEndpoint, baseUrl)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value))
        }
      })
    }
    
    return url.toString()
  }

  private async getHeaders(additionalHeaders?: Record<string, string>): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(additionalHeaders ?? {})
    }

    if (typeof window !== 'undefined') {
      const nowMs = Date.now()
      
      if (cachedAccessToken && cachedAccessTokenExpiresAtMs - nowMs > TOKEN_REFRESH_SAFETY_WINDOW_MS) {
        headers['Authorization'] = `Bearer ${cachedAccessToken}`
        return headers
      }

      if (nowMs - lastSessionCheckAtMs < SESSION_CHECK_COOLDOWN_MS) {
        if (cachedAccessToken) headers['Authorization'] = `Bearer ${cachedAccessToken}`
        return headers
      }

      if (sessionCheckInProgress) {
        await sessionCheckInProgress
        if (cachedAccessToken) headers['Authorization'] = `Bearer ${cachedAccessToken}`
        return headers
      }

      lastSessionCheckAtMs = nowMs
      sessionCheckInProgress = (async () => {
        try {
          const { createClient } = await import('@/lib/supabase')
          const supabase = createClient()
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error || !session?.access_token) {
            cachedAccessToken = null
            cachedAccessTokenExpiresAtMs = 0
          } else {
            cachedAccessToken = session.access_token
            cachedAccessTokenExpiresAtMs = (session.expires_at ?? 0) * 1000
          }
        } catch {
          // Mantém token atual em caso de erro
        } finally {
          sessionCheckInProgress = null
        }
      })()

      await sessionCheckInProgress
      if (cachedAccessToken) headers['Authorization'] = `Bearer ${cachedAccessToken}`
    }

    return headers
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options?: { data?: any; params?: Record<string, any>; silent?: boolean; isUpload?: boolean }
  ): Promise<ApiResponse<T> | undefined> {
    try {
      const url = this.buildURL(endpoint, options?.params)
      const headers = await this.getHeaders()
      
      if (options?.isUpload) {
        delete headers['Content-Type']
      }

      const response = await this.fetchWithTimeout(url, {
        method,
        headers,
        ...(options?.data && !options?.isUpload ? { body: JSON.stringify(options.data) } : {}),
        ...(options?.data && options?.isUpload ? { body: options.data } : {}),
        credentials: 'include'
      }, this.requestTimeoutMs * (options?.isUpload ? 2 : 1))

      return await this.handleResponse<T>(response, options?.silent)
    } catch (error) {
      if (error && typeof error === 'object' && 'success' in error) {
        throw error
      }
      throw {
        success: false,
        error: error instanceof Error ? error.message : `Erro na requisição ${method}`,
        statusCode: (error as any)?.statusCode || 0
      } as ApiError
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T> | undefined> {
    return this.request<T>('GET', endpoint, { params })
  }

  async post<T>(endpoint: string, data?: any, silent = false): Promise<ApiResponse<T> | undefined> {
    return this.request<T>('POST', endpoint, { data, silent })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T> | undefined> {
    return this.request<T>('PUT', endpoint, { data })
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T> | undefined> {
    return this.request<T>('PATCH', endpoint, { data })
  }

  async delete<T>(endpoint: string, data?: any): Promise<ApiResponse<T> | undefined> {
    return this.request<T>('DELETE', endpoint, { data })
  }

  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value
  }

  removeHeader(key: string): void {
    delete this.defaultHeaders[key]
  }

  setBaseURL(url: string): void {
    this.baseURL = url
  }

  setTimeoutMs(timeoutMs: number): void {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return
    this.requestTimeoutMs = timeoutMs
  }

  async healthCheck(): Promise<ApiResponse<{ message: string; timestamp: string }> | undefined> {
    return this.get('/health')
  }

  async uploadFile<T>(endpoint: string, file: File, fieldName: string = 'file'): Promise<ApiResponse<T> | undefined> {
    const formData = new FormData()
    formData.append(fieldName, file)
    return this.request<T>('POST', endpoint, { data: formData, isUpload: true })
  }
}

export const apiClient = new ApiClient()
export type { ApiClient }
