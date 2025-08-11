import { apiClient } from './apiClient'

export interface User {
  id: string
  email: string
  role: 'admin' | 'user'
  first_name?: string
  last_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    token: string
    role?: string
  }
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  first_name?: string
  last_name?: string
  role?: 'admin' | 'user'
}

export interface ApiErrorResponse {
  success: false
  message: string
  error: string
  errors?: Array<{
    field: string
    message: string
  }>
}

class AuthService {
  private baseURL = '/api/auth'

  // Store token in localStorage
  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
      // Set default Authorization header for future requests
      apiClient.setHeader('Authorization', `Bearer ${token}`)
    }
  }

  // Get token from localStorage
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  }

  // Remove token from localStorage
  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      apiClient.removeHeader('Authorization')
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken()
    return !!token
  }

  // Initialize auth service (set token in apiClient if exists)
  init(): void {
    const token = this.getToken()
    if (token) {
      apiClient.setHeader('Authorization', `Bearer ${token}`)
    }
  }

  // Login user
  async login(credentials: LoginData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(`${this.baseURL}/login`, credentials)
      
      if (response.success && response.data?.token) {
        this.setToken(response.data.token)
      }
      
      return response
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  // Register user
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(`${this.baseURL}/register`, userData)
      
      if (response.success && response.data?.token) {
        this.setToken(response.data.token)
      }
      
      return response
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      // Try to logout on server (to add token to denylist)
      await apiClient.post(`${this.baseURL}/logout`)
    } catch (error) {
      // Even if server logout fails, we should remove local token
      console.warn('Server logout failed, but removing local token')
    } finally {
      this.removeToken()
    }
  }

  // Get current user profile
  async getProfile(): Promise<{ success: boolean; data: { user: User } }> {
    try {
      const response = await apiClient.get(`${this.baseURL}/me`)
      return response
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  // Test admin access
  async testAdminAccess(): Promise<{ success: boolean; message: string; user: User }> {
    try {
      const response = await apiClient.get(`${this.baseURL}/admin/test`)
      return response
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  // Test user access
  async testUserAccess(): Promise<{ success: boolean; message: string; user: User }> {
    try {
      const response = await apiClient.get(`${this.baseURL}/user/test`)
      return response
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  // Handle API errors
  private handleError(error: any): ApiErrorResponse {
    if (error.details) {
      return error.details
    }
    
    return {
      success: false,
      message: error.error || error.message || 'Ocorreu um erro inesperado',
      error: 'NETWORK_ERROR'
    }
  }
}

export const authService = new AuthService()

// Initialize auth service
if (typeof window !== 'undefined') {
  authService.init()
}