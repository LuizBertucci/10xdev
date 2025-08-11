/**
 * HTTP INTERCEPTOR - Padrão da documentação (plugins/axios.js)
 * 
 * Funcionalidades:
 * - Adiciona JWT automaticamente nas requisições
 * - Intercepta respostas 401 para redirecionamento
 * - Renova tokens automaticamente
 * - Redireciona para login quando necessário
 */

import authService from './authService'

// Configuração base da API
const API_BASE_URL = 'http://localhost:3007/api'

/**
 * Interceptador HTTP com JWT automático
 */
class HttpInterceptor {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
    console.log('🌐 [HttpInterceptor] Interceptador inicializado')
  }

  /**
   * Fazer requisição com interceptadores automáticos
   */
  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`
    
    // Preparar headers com JWT automático (padrão da documentação)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    }

    // Adicionar JWT automaticamente se disponível
    const token = authService.getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      console.log('🔐 [Interceptor] JWT adicionado automaticamente')
    }

    // Configurar requisição
    const requestOptions: RequestInit = {
      ...options,
      headers
    }

    console.log(`📡 [Interceptor] ${options.method || 'GET'} ${endpoint}`)

    // Fazer primeira tentativa
    let response = await fetch(url, requestOptions)

    // Interceptar resposta 401 (equivalente ao plugin axios da documentação)
    if (response.status === 401) {
      console.log('🔄 [Interceptor] 401 detectado - Token expirado')
      
      const refreshed = await this.handleTokenExpired()
      if (refreshed) {
        // Tentar novamente com token renovado
        const newToken = authService.getAccessToken()
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`
          requestOptions.headers = headers
          response = await fetch(url, requestOptions)
          console.log('✅ [Interceptor] Requisição refeita com novo token')
        }
      }
    }

    // Interceptar outras respostas que requerem redirecionamento
    await this.handleResponseInterception(response)

    return response
  }

  /**
   * Métodos HTTP convenientes
   */
  async get(endpoint: string, options: RequestInit = {}): Promise<Response> {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  async post(endpoint: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put(endpoint: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete(endpoint: string, options: RequestInit = {}): Promise<Response> {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }

  /**
   * Lidar com token expirado (padrão da documentação)
   */
  private async handleTokenExpired(): Promise<boolean> {
    try {
      console.log('🔄 [Interceptor] Tentando renovar token...')
      const refreshed = await authService.refreshAccessToken()
      
      if (refreshed) {
        console.log('✅ [Interceptor] Token renovado com sucesso')
        return true
      } else {
        console.log('❌ [Interceptor] Falha ao renovar token')
        await this.redirectToLogin()
        return false
      }
    } catch (error) {
      console.error('❌ [Interceptor] Erro ao renovar token:', error)
      await this.redirectToLogin()
      return false
    }
  }

  /**
   * Interceptar respostas para redirecionamento automático
   */
  private async handleResponseInterception(response: Response): Promise<void> {
    if (!response.ok) {
      try {
        const responseData = await response.clone().json()
        
        // Se a API solicita redirecionamento (padrão verify_user)
        if (responseData.redirect) {
          console.log(`🔄 [Interceptor] Redirecionamento solicitado: ${responseData.redirect}`)
          await this.redirectToLogin()
          return
        }

        // Códigos que indicam necessidade de autenticação
        if (response.status === 401 && responseData.code === 'USER_NOT_AUTHENTICATED') {
          await this.redirectToLogin()
          return
        }

      } catch (parseError) {
        // Resposta não é JSON, continuar normalmente
      }
    }
  }

  /**
   * Redirecionar para login (padrão da documentação)
   */
  private async redirectToLogin(): Promise<void> {
    try {
      // Fazer logout para limpar tokens inválidos
      await authService.logout()
      
      // Redirecionar apenas se estivermos no cliente
      if (typeof window !== 'undefined') {
        console.log('🔄 [Interceptor] Redirecionando para login...')
        
        // Salvar página atual para redirecionamento pós-login
        const currentPath = window.location.pathname
        if (currentPath !== '/' && currentPath !== '/login' && currentPath !== '/register') {
          sessionStorage.setItem('redirectAfterLogin', currentPath)
        }
        
        // Mostrar mensagem para o usuário
        if ('sessionStorage' in window) {
          sessionStorage.setItem('loginMessage', 'Sua sessão expirou. Faça login novamente.')
        }
        
        // Redirecionar para login
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('❌ [Interceptor] Erro no redirecionamento:', error)
    }
  }

  /**
   * Fazer requisição sem interceptadores (para endpoints de auth)
   */
  async rawRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    }

    console.log(`📡 [Interceptor] RAW ${options.method || 'GET'} ${endpoint}`)

    return fetch(url, {
      ...options,
      headers
    })
  }
}

// Instância singleton
export const httpInterceptor = new HttpInterceptor()

/**
 * API Helper com interceptadores (padrão da documentação)
 */
export const api = {
  // Auth endpoints (sem interceptadores para evitar loops)
  auth: {
    login: (data: any) => httpInterceptor.rawRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    register: (data: any) => httpInterceptor.rawRequest('/auth/register', {
      method: 'POST', 
      body: JSON.stringify(data)
    }),
    refresh: (data: any) => httpInterceptor.rawRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    validate: (data: any) => httpInterceptor.rawRequest('/auth/validate', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    // Logout usa interceptador para adicionar JWT
    logout: (data?: any) => httpInterceptor.post('/auth/logout', data),
    me: () => httpInterceptor.get('/auth/me')
  },

  // Endpoints protegidos (com interceptadores - padrão verify_user)
  cardFeatures: {
    list: (params?: string) => httpInterceptor.get(`/card-features${params || ''}`),
    get: (id: string) => httpInterceptor.get(`/card-features/${id}`),
    create: (data: any) => httpInterceptor.post('/card-features', data),
    update: (id: string, data: any) => httpInterceptor.put(`/card-features/${id}`, data),
    delete: (id: string) => httpInterceptor.delete(`/card-features/${id}`)
  },

  // Qualquer endpoint que precise de verify_user
  protected: {
    get: (endpoint: string) => httpInterceptor.get(endpoint),
    post: (endpoint: string, data?: any) => httpInterceptor.post(endpoint, data),
    put: (endpoint: string, data?: any) => httpInterceptor.put(endpoint, data),
    delete: (endpoint: string) => httpInterceptor.delete(endpoint)
  }
}

export default httpInterceptor