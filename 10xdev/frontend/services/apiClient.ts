// ================================================
// API CLIENT - Base HTTP client configuration
// ================================================

import type { ApiResponse, ApiError } from '../types/api'

class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
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
      throw new Error('Error processing server response')
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
        error: error instanceof Error ? error.message : 'Error in GET request',
        statusCode: 0
      } as ApiError
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = this.buildURL(endpoint)
      
      let body: string | undefined
      if (data) {
        try {
          body = JSON.stringify(data)
        } catch (serializationError) {
          throw new Error('Error serializing data to JSON')
        }
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.defaultHeaders,
        body,
        credentials: 'include'
      })
      
      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error && typeof error === 'object' && 'success' in error) {
        throw error
      }
      throw {
        success: false,
        error: error instanceof Error ? error.message : 'Error in POST request',
        statusCode: 0
      } as ApiError
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = this.buildURL(endpoint)
      
      const response = await fetch(url, {
        method: 'PUT',
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
        error: error instanceof Error ? error.message : 'Error in PUT request',
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
        error: error instanceof Error ? error.message : 'Error in DELETE request',
        statusCode: 0
      } as ApiError
    }
  }

  // Method to update headers (e.g. authentication)
  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value
  }

  // Method to remove header
  removeHeader(key: string): void {
    delete this.defaultHeaders[key]
  }

  // Method to set base URL
  setBaseURL(url: string): void {
    this.baseURL = url
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ message: string; timestamp: string }>> {
    return this.get('/health')
  }

}

// Singleton instance
export const apiClient = new ApiClient()