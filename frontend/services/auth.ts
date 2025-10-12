import { API_BASE_URL } from './api'
import type { LoginData, RegisterData, AuthResponse, User } from '@/types/auth'

export class AuthService {
  /**
   * Login with email and password
   */
  static async login(credentials: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao fazer login')
    }

    const data: AuthResponse = await response.json()

    // Store token and user in localStorage
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    // Also store in cookies for better persistence
    this.setCookie('auth_token', data.token, 1) // 1 day

    return data
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao criar conta')
    }

    const data: AuthResponse = await response.json()

    // Store token and user
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    this.setCookie('auth_token', data.token, 1)

    return data
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    const token = this.getStoredToken()

    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/sessions`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (error) {
        console.error('Error during logout:', error)
      }
    }

    // Clear all stored data
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')

    // Clear cookies with multiple attempts for different paths/domains
    this.deleteCookie('auth_token')
  }

  /**
   * Get current user from backend
   */
  static async getCurrentUser(): Promise<User | null> {
    const token = this.getStoredToken()

    if (!token) {
      return null
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.user
    } catch (error) {
      console.error('Error fetching current user:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: Partial<User>): Promise<User> {
    const token = this.getStoredToken()

    if (!token) {
      throw new Error('Não autenticado')
    }

    const response = await fetch(`${API_BASE_URL}/auth/members`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao atualizar perfil')
    }

    const data = await response.json()

    // Update stored user
    localStorage.setItem('user', JSON.stringify(data.user))

    return data.user
  }

  /**
   * Delete user account
   */
  static async deleteAccount(): Promise<void> {
    const token = this.getStoredToken()

    if (!token) {
      throw new Error('Não autenticado')
    }

    const response = await fetch(`${API_BASE_URL}/auth/members`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao deletar conta')
    }

    // Clear all stored data
    await this.logout()
  }

  /**
   * Get stored token from localStorage
   */
  static getStoredToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
  }

  /**
   * Get stored user from localStorage
   */
  static getStoredUser(): User | null {
    if (typeof window === 'undefined') return null

    const userStr = localStorage.getItem('user')
    if (!userStr) return null

    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getStoredToken()
  }

  /**
   * Check if user is admin
   */
  static isAdmin(): boolean {
    const user = this.getStoredUser()

    if (!user) return false

    // Check role or email contains 'admin'
    return (
      user.role === 'admin' ||
      Boolean(user.email?.toLowerCase().includes('admin'))
    )
  }

  /**
   * Set cookie
   */
  private static setCookie(name: string, value: string, days: number): void {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
  }

  /**
   * Delete cookie with multiple attempts
   */
  private static deleteCookie(name: string): void {
    const deleteCookieAttempt = (cookieName: string, path?: string, domain?: string) => {
      let cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`

      if (path) cookie += `;path=${path}`
      if (domain) cookie += `;domain=${domain}`

      document.cookie = cookie
    }

    // Try multiple combinations
    deleteCookieAttempt(name)
    deleteCookieAttempt(name, '/')
    deleteCookieAttempt(name, '/', window.location.hostname)
    deleteCookieAttempt(name, '/', `.${window.location.hostname}`)

    // Also try with subdomain variations
    const hostParts = window.location.hostname.split('.')
    if (hostParts.length > 2) {
      deleteCookieAttempt(name, '/', `.${hostParts.slice(-2).join('.')}`)
    }
  }
}
