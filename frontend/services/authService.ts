/**
 * AUTH SERVICE - Sistema de Autenticação Frontend
 * 
 * Funcionalidades:
 * - Login/logout com JWT
 * - Registro de novos usuários  
 * - Gestão de tokens (access + refresh)
 * - Verificação de permissões (admin/user)
 * - Persistência local de sessão
 */

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  email_verified: boolean
  created_at: string
  updated_at: string
  last_login: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: User
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  avatar_url?: string
}

export interface AuthResponse {
  success: boolean
  message?: string
  data?: AuthTokens
  error?: string
  code?: string
}

class AuthService {
  private readonly API_BASE = 'http://localhost:3007/api/auth'
  private readonly TOKEN_KEY = '10xdev_access_token'
  private readonly REFRESH_KEY = '10xdev_refresh_token'
  private readonly USER_KEY = '10xdev_user'
  
  private currentUser: User | null = null
  private accessToken: string | null = null
  private refreshToken: string | null = null

  /**
   * Verifica se estamos no lado do cliente
   */
  private get isClient(): boolean {
    return typeof window !== 'undefined'
  }

  constructor() {
    // Só carregar storage se estivermos no cliente
    if (this.isClient) {
      this.loadFromStorage()
    }
    console.log('🔐 [AuthService] Inicializado')
  }

  /**
   * CARREGAR DADOS DO STORAGE LOCAL
   */
  private loadFromStorage(): void {
    try {
      // Verificar se estamos no cliente (browser)
      if (!this.isClient) return

      const token = localStorage.getItem(this.TOKEN_KEY)
      const refresh = localStorage.getItem(this.REFRESH_KEY)
      const userStr = localStorage.getItem(this.USER_KEY)

      if (token && refresh && userStr) {
        this.accessToken = token
        this.refreshToken = refresh
        this.currentUser = JSON.parse(userStr)
        console.log(`👤 [AuthService] Sessão carregada: ${this.currentUser?.email}`)
      }
    } catch (error) {
      console.error('❌ [AuthService] Erro ao carregar do storage:', error)
      this.clearStorage()
    }
  }

  /**
   * SALVAR DADOS NO STORAGE LOCAL
   */
  private saveToStorage(tokens: AuthTokens): void {
    try {
      // Atualizar estado sempre
      this.accessToken = tokens.accessToken
      this.refreshToken = tokens.refreshToken
      this.currentUser = tokens.user

      // Salvar no localStorage apenas se estivermos no cliente
      if (this.isClient) {
        localStorage.setItem(this.TOKEN_KEY, tokens.accessToken)
        localStorage.setItem(this.REFRESH_KEY, tokens.refreshToken)
        localStorage.setItem(this.USER_KEY, JSON.stringify(tokens.user))
      }
    } catch (error) {
      console.error('❌ [AuthService] Erro ao salvar no storage:', error)
    }
  }

  /**
   * LIMPAR STORAGE LOCAL
   */
  private clearStorage(): void {
    // Limpar estado sempre
    this.accessToken = null
    this.refreshToken = null
    this.currentUser = null
    
    // Limpar localStorage apenas se estivermos no cliente
    if (this.isClient) {
      localStorage.removeItem(this.TOKEN_KEY)
      localStorage.removeItem(this.REFRESH_KEY)
      localStorage.removeItem(this.USER_KEY)
    }
  }

  /**
   * FAZER REQUISIÇÃO COM AUTENTICAÇÃO
   */
  private async authRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.API_BASE}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    }

    // Adicionar token de acesso se disponível
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  /**
   * REGISTRAR NOVO USUÁRIO
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      console.log(`📝 [AuthService] Registrando usuário: ${userData.email}`)

      const response = await fetch(`${this.API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (data.success && data.data) {
        this.saveToStorage(data.data)
        console.log(`✅ [AuthService] Registro bem-sucedido: ${data.data.user.email}`)
      }

      return data
    } catch (error: any) {
      console.error('❌ [AuthService] Erro no registro:', error)
      return {
        success: false,
        error: 'Erro de conexão com o servidor',
        code: 'NETWORK_ERROR'
      }
    }
  }

  /**
   * FAZER LOGIN
   */
  async login(credentials: LoginData): Promise<AuthResponse> {
    try {
      console.log(`🔑 [AuthService] Fazendo login: ${credentials.email}`)

      const response = await fetch(`${this.API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (data.success && data.data) {
        this.saveToStorage(data.data)
        console.log(`✅ [AuthService] Login bem-sucedido: ${data.data.user.email}`)
      }

      return data
    } catch (error: any) {
      console.error('❌ [AuthService] Erro no login:', error)
      return {
        success: false,
        error: 'Erro de conexão com o servidor',
        code: 'NETWORK_ERROR'
      }
    }
  }

  /**
   * FAZER LOGOUT
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 [AuthService] Fazendo logout')

      // Tentar notificar o servidor
      if (this.accessToken) {
        await this.authRequest('/logout', {
          method: 'POST',
          body: JSON.stringify({
            refreshToken: this.refreshToken
          })
        })
      }
    } catch (error) {
      console.warn('⚠️ [AuthService] Erro ao notificar logout no servidor:', error)
    } finally {
      this.clearStorage()
      console.log('✅ [AuthService] Logout completo')
    }
  }

  /**
   * RENOVAR TOKEN DE ACESSO
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.refreshToken) {
        return false
      }

      console.log('🔄 [AuthService] Renovando token de acesso')

      const response = await fetch(`${this.API_BASE}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      })

      const data = await response.json()

      if (data.success && data.data) {
        this.saveToStorage(data.data)
        console.log('✅ [AuthService] Token renovado com sucesso')
        return true
      } else {
        console.error('❌ [AuthService] Falha ao renovar token:', data.error)
        this.clearStorage()
        return false
      }
    } catch (error) {
      console.error('❌ [AuthService] Erro ao renovar token:', error)
      this.clearStorage()
      return false
    }
  }

  /**
   * OBTER PERFIL DO USUÁRIO ATUAL
   */
  async getProfile(): Promise<User | null> {
    try {
      const response = await this.authRequest('/me')
      const data = await response.json()

      if (data.success && data.data) {
        this.currentUser = data.data.user
        if (this.isClient) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(this.currentUser))
        }
        return this.currentUser
      }

      return null
    } catch (error) {
      console.error('❌ [AuthService] Erro ao obter perfil:', error)
      return null
    }
  }

  /**
   * VERIFICAR SE ESTÁ LOGADO
   */
  isAuthenticated(): boolean {
    return !!(this.accessToken && this.currentUser)
  }

  /**
   * VERIFICAR SE É ADMIN
   */
  isAdmin(): boolean {
    if (!this.currentUser) return false
    
    // Emails de admin configurados
    const adminEmails = [
      'admin@10xdev.com',
      'samuel@10xdev.com'
    ]
    
    return adminEmails.includes(this.currentUser.email)
  }

  /**
   * OBTER USUÁRIO ATUAL
   */
  getCurrentUser(): User | null {
    return this.currentUser
  }

  /**
   * OBTER TOKEN DE ACESSO
   */
  getAccessToken(): string | null {
    return this.accessToken
  }

  /**
   * VALIDAR TOKEN ATUAL
   */
  async validateToken(): Promise<boolean> {
    try {
      if (!this.accessToken) return false

      const response = await fetch(`${this.API_BASE}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: this.accessToken
        })
      })

      const data = await response.json()
      return data.success && data.valid
    } catch (error) {
      console.error('❌ [AuthService] Erro ao validar token:', error)
      return false
    }
  }

  /**
   * REQUISIÇÃO AUTENTICADA COM RETRY AUTOMÁTICO
   */
  async authenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    // Primeira tentativa
    let response = await this.authRequest(url.replace(this.API_BASE, ''), options)

    // Se retornou 401, tentar renovar token
    if (response.status === 401) {
      console.log('🔄 [AuthService] Token expirado, tentando renovar...')
      
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        // Segunda tentativa com token renovado
        response = await this.authRequest(url.replace(this.API_BASE, ''), options)
      }
    }

    return response
  }
}

// Instância singleton
export const authService = new AuthService()

// Utilitários
export const useAuth = () => {
  return {
    user: authService.getCurrentUser(),
    isAuthenticated: authService.isAuthenticated(),
    isAdmin: authService.isAdmin(),
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    register: authService.register.bind(authService),
    getProfile: authService.getProfile.bind(authService),
    validateToken: authService.validateToken.bind(authService)
  }
}

export default authService