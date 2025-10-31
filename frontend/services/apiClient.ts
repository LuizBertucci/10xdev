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
    
    let data: any
    try {
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }
    } catch (error) {
      throw new Error('Erro ao processar resposta do servidor')
    }

    if (!response.ok) {
      throw {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}`,
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
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.defaultHeaders,
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
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.defaultHeaders,
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
        error: error instanceof Error ? error.message : 'Erro na requisição POST',
        statusCode: 0
      } as ApiError
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = this.buildURL(endpoint)
      console.log('PUT request URL:', url)
      console.log('PUT request data:', data)
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.defaultHeaders,
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
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.defaultHeaders,
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
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.defaultHeaders,
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
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.defaultHeaders,
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