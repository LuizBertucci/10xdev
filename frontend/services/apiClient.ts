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

  constructor() {
    // Configuração automática da URL da API baseada no ambiente
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'

    this.baseURL = isLocalhost
      ? 'http://localhost:3001/api'
      : 'https://web-backend-10xdev.azurewebsites.net/api'

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type')
    
    let data: any = {}
    try {
      const textData = await response.text()
      
      if (textData) {
        if (contentType && contentType.includes('application/json')) {
          try {
            data = JSON.parse(textData)
          } catch (parseError) {
            console.error('Erro ao fazer parse do JSON:', parseError)
            data = { error: textData || `HTTP ${response.status}` }
          }
        } else {
          data = { error: textData || `HTTP ${response.status}` }
        }
      }
    } catch (error) {
      console.error('Erro ao processar resposta:', error)
      data = { error: 'Erro ao processar resposta do servidor' }
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

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      const url = this.buildURL(endpoint, params)
      
      // Obter token do Supabase
      const headers = { ...this.defaultHeaders }
      if (typeof window !== 'undefined') {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      })

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

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = this.buildURL(endpoint)
      console.log('POST request URL:', url)
      console.log('POST request data:', data)
      
      // Obter token do Supabase
      const headers = { ...this.defaultHeaders }
      if (typeof window !== 'undefined') {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }
      
      console.log('POST request headers:', { ...headers, Authorization: headers['Authorization'] ? 'Bearer ***' : 'none' })
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      })

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

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = this.buildURL(endpoint)
      console.log('PUT request URL:', url)
      console.log('PUT request data:', data)
      
      // Obter token do Supabase
      const headers = { ...this.defaultHeaders }
      if (typeof window !== 'undefined') {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }
      
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      })

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

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = this.buildURL(endpoint)
      
      // Obter token do Supabase
      const headers = { ...this.defaultHeaders }
      if (typeof window !== 'undefined') {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      })

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

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const url = this.buildURL(endpoint)
      
      // Obter token do Supabase
      const headers = { ...this.defaultHeaders }
      if (typeof window !== 'undefined') {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })

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

  async deleteWithBody<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = this.buildURL(endpoint)
      
      // Obter token do Supabase
      const headers = { ...this.defaultHeaders }
      if (typeof window !== 'undefined') {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      })

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

  // Health check
  async healthCheck(): Promise<ApiResponse<{ message: string; timestamp: string }>> {
    return this.get('/health')
  }
}

// Instância singleton
export const apiClient = new ApiClient()

// Export do tipo para uso externo
export type { ApiClient }