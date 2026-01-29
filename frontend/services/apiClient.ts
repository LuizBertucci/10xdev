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

class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>
  private requestTimeoutMs: number

  constructor() {
    // Configuração automática da URL da API baseada no ambiente
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'

    this.baseURL = isLocalhost
      ? 'http://localhost:3001/api'
      : 'https://api.10xdev.com.br/api'

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    // Timeout padrão para evitar requests pendurados indefinidamente (ms)
    // Pode ser sobrescrito via env pública do Next.
    const envTimeout = typeof process !== 'undefined'
      ? Number((process.env as any)?.NEXT_PUBLIC_API_TIMEOUT_MS)
      : NaN
    this.requestTimeoutMs = Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 15000
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    // Se não existir timeout, delega direto para fetch
    if (!timeoutMs || timeoutMs <= 0) {
      return fetch(url, init)
    }

    const controller = new AbortController()
    let timedOut = false

    // Se veio um signal externo, propagar abort para o nosso controller
    const externalSignal = init.signal
    const onAbort = () => controller.abort()
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort()
      } else {
        externalSignal.addEventListener('abort', onAbort, { once: true })
      }
    }

    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      return response
    } catch (error: any) {
      // Normalizar timeout para um ApiError consistente
      if (error?.name === 'AbortError' && timedOut) {
        throw {
          success: false,
          error: `Timeout: API não respondeu em ${Math.round(timeoutMs / 1000)}s`,
          statusCode: 408
        } as ApiError
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onAbort as any)
      }
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T> | undefined> {
    const contentType = response.headers.get('content-type')

    let data: ApiResponse<T> | undefined
    try {
      const textData = await response.text()

      if (textData) {
        if (contentType && contentType.includes('application/json')) {
          try {
            data = JSON.parse(textData) as ApiResponse<T>
          } catch (parseError) {
            console.error('Erro ao fazer parse do JSON:', parseError)
            data = { success: false, error: textData || `HTTP ${response.status}` }
          }
        } else {
          data = { success: false, error: textData || `HTTP ${response.status}` }
        }
      }
    } catch (error) {
      console.error('Erro ao processar resposta:', error)
      data = { success: false, error: 'Erro ao processar resposta do servidor' }
    }

    if (!response.ok) {
      // Tentar extrair mensagem de erro de diferentes formatos
      const errorMessage = 
        data?.error || 
        data?.message || 
        (typeof data === 'string' ? data : null) ||
        `HTTP ${response.status}: ${response.statusText || 'Erro desconhecido'}`
      
      console.error('Erro na resposta HTTP:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        data: data,
        errorMessage
      })
      
      throw {
        success: false,
        error: errorMessage,
        statusCode: response.status,
        details: data
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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H8',location:'apiClient.ts:174',message:'getHeaders before getSession',data:{hasWindow:true},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H8',location:'apiClient.ts:180',message:'getHeaders after getSession',data:{hasToken:Boolean(session?.access_token)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }

    return headers
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T> | undefined> {
    try {
      const url = this.buildURL(endpoint, params)
      const headers = await this.getHeaders()

      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      }, this.requestTimeoutMs)

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error && typeof error === 'object' && 'success' in error) {
        throw error
      }
      throw {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na requisição GET',
        statusCode: 0
      } as ApiError
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T> | undefined> {
    try {
      const url = this.buildURL(endpoint)
      console.log('POST request URL:', url)
      console.log('POST request data:', data)

      const headers = await this.getHeaders()

      console.log('POST request headers:', { ...headers, Authorization: headers['Authorization'] ? 'Bearer ***' : 'none' })
      
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      }, this.requestTimeoutMs)

      console.log('POST response status:', response.status)
      console.log('POST response ok:', response.ok)

      return await this.handleResponse<T>(response)
    } catch (error) {
      console.error('POST request error:', error)
      if (error && typeof error === 'object' && 'success' in error) {
        throw error
      }
      const errorMessage = error instanceof Error ? error.message : 
                          (error && typeof error === 'object' && 'error' in error) ? (error as any).error :
                          'Erro na requisição POST'
      throw {
        success: false,
        error: errorMessage,
        statusCode: (error && typeof error === 'object' && 'statusCode' in error) ? (error as any).statusCode : 0
      } as ApiError
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T> | undefined> {
    try {
      const url = this.buildURL(endpoint)
      console.log('PUT request URL:', url)
      console.log('PUT request data:', data)

      const headers = await this.getHeaders()

      const response = await this.fetchWithTimeout(url, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      }, this.requestTimeoutMs)

      console.log('PUT response status:', response.status)
      console.log('PUT response ok:', response.ok)
      return await this.handleResponse<T>(response)
    } catch (error) {
      console.error('PUT request error:', error)
      if (error && typeof error === 'object' && 'success' in error) {
        throw error
      }
      throw {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na requisição PUT',
        statusCode: 0
      } as ApiError
    }
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T> | undefined> {
    try {
      const url = this.buildURL(endpoint)

      const headers = await this.getHeaders()

      const response = await this.fetchWithTimeout(url, {
        method: 'PATCH',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      }, this.requestTimeoutMs)

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error && typeof error === 'object' && 'success' in error) {
        throw error
      }
      throw {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na requisição PATCH',
        statusCode: 0
      } as ApiError
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T> | undefined> {
    try {
      const url = this.buildURL(endpoint)

      const headers = await this.getHeaders()

      const response = await this.fetchWithTimeout(url, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      }, this.requestTimeoutMs)

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error && typeof error === 'object' && 'success' in error) {
        throw error
      }
      throw {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na requisição DELETE',
        statusCode: 0
      } as ApiError
    }
  }

  async deleteWithBody<T>(endpoint: string, data?: any): Promise<ApiResponse<T> | undefined> {
    try {
      const url = this.buildURL(endpoint)

      const headers = await this.getHeaders()

      const response = await this.fetchWithTimeout(url, {
        method: 'DELETE',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      }, this.requestTimeoutMs)

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error && typeof error === 'object' && 'success' in error) {
        throw error
      }
      throw {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na requisição DELETE',
        statusCode: 0
      } as ApiError
    }
  }

  // Método para atualizar headers (ex: autenticação)
  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value
  }

  // Método para remover header
  removeHeader(key: string): void {
    delete this.defaultHeaders[key]
  }

  // Método para definir base URL
  setBaseURL(url: string): void {
    this.baseURL = url
  }

  // Método para definir timeout de request (ms)
  setTimeoutMs(timeoutMs: number): void {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return
    this.requestTimeoutMs = timeoutMs
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ message: string; timestamp: string }> | undefined> {
    return this.get('/health')
  }

  // Upload de arquivo (FormData)
  async uploadFile<T>(endpoint: string, file: File, fieldName: string = 'file'): Promise<ApiResponse<T> | undefined> {
    try {
      const url = this.buildURL(endpoint)
      console.log('UPLOAD request URL:', url)

      // Criar FormData
      const formData = new FormData()
      formData.append(fieldName, file)

      // Headers sem Content-Type (browser define automaticamente com boundary)
      const headers = await this.getHeaders()
      delete headers['Content-Type']

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      }, this.requestTimeoutMs * 2) // Timeout maior para upload

      console.log('UPLOAD response status:', response.status)
      return await this.handleResponse<T>(response)
    } catch (error) {
      console.error('UPLOAD request error:', error)
      if (error && typeof error === 'object' && 'success' in error) {
        throw error
      }
      throw {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no upload do arquivo',
        statusCode: 0
      } as ApiError
    }
  }
}

// Instância singleton
export const apiClient = new ApiClient()

// Export do tipo para uso externo
export type { ApiClient }