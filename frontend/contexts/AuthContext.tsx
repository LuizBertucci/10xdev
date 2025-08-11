'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import authService, { User } from '@/services/authService'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<boolean>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Carregar usuário ao inicializar
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser()
        
        if (currentUser) {
          // Verificar se o token ainda é válido
          const isValid = await authService.validateToken()
          
          if (isValid) {
            setUser(currentUser)
            console.log('🔐 [AuthContext] Usuário autenticado:', currentUser.email)
          } else {
            // Token inválido, tentar renovar
            const refreshed = await authService.refreshAccessToken()
            if (refreshed) {
              setUser(authService.getCurrentUser())
              console.log('🔄 [AuthContext] Token renovado')
            } else {
              await authService.logout()
              console.log('🚪 [AuthContext] Sessão expirada, logout automático')
            }
          }
        }
      } catch (error) {
        console.error('❌ [AuthContext] Erro na inicialização:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await authService.login({ email, password })
      
      if (result.success && result.data) {
        setUser(result.data.user)
        console.log('✅ [AuthContext] Login realizado:', result.data.user.email)
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ [AuthContext] Erro no login:', error)
      return false
    }
  }

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const result = await authService.register({ email, password, name })
      
      if (result.success && result.data) {
        setUser(result.data.user)
        console.log('✅ [AuthContext] Registro realizado:', result.data.user.email)
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ [AuthContext] Erro no registro:', error)
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await authService.logout()
      setUser(null)
      console.log('🚪 [AuthContext] Logout realizado')
    } catch (error) {
      console.error('❌ [AuthContext] Erro no logout:', error)
    }
  }

  const refreshUser = async (): Promise<void> => {
    try {
      const profile = await authService.getProfile()
      if (profile) {
        setUser(profile)
        console.log('👤 [AuthContext] Perfil atualizado')
      }
    } catch (error) {
      console.error('❌ [AuthContext] Erro ao atualizar perfil:', error)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user ? authService.isAdmin() : false,
    isLoading,
    login,
    logout,
    register,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// HOC para componentes que precisam de autenticação
export function withAuth<T extends object>(Component: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Acesso Restrito
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Você precisa estar logado para acessar esta página.
            </p>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}

// HOC para componentes que precisam de permissão de admin
export function withAdmin<T extends object>(Component: React.ComponentType<T>) {
  return function AdminComponent(props: T) {
    const { isAuthenticated, isAdmin, isLoading } = useAuth()

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Acesso Restrito
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Você precisa estar logado para acessar esta página.
            </p>
          </div>
        </div>
      )
    }

    if (!isAdmin) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Acesso Negado
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Apenas administradores podem acessar esta página.
            </p>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              👑 Entre com uma conta de administrador para continuar
            </div>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}