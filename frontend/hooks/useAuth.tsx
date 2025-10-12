'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth'
import type { User, LoginData, RegisterData, AuthContextType } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Auto-validate token on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = AuthService.getStoredUser()
        const token = AuthService.getStoredToken()

        if (storedUser && token) {
          // Verificar se o token ainda é válido
          const currentUser = await AuthService.getCurrentUser()
          if (currentUser) {
            setUser(currentUser)
          } else {
            // Token inválido, limpar dados
            await AuthService.logout()
          }
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar auth:', error)
        await AuthService.logout()
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (credentials: LoginData) => {
    try {
      const response = await AuthService.login(credentials)
      setUser(response.user)
      router.push('/dashboard')
    } catch (error: any) {
      throw error
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      const response = await AuthService.register(userData)
      setUser(response.user)
      router.push('/dashboard')
    } catch (error: any) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await AuthService.logout()
      setUser(null)

      // Robust cookie deletion
      const deleteCookie = (name: string) => {
        // Try multiple deletion approaches
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`

        // Try with subdomain variations
        const hostParts = window.location.hostname.split('.')
        if (hostParts.length > 2) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${hostParts.slice(-2).join('.')}`
        }

        // Try without domain
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`

        // Try with SameSite attributes
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=None;Secure`
      }

      deleteCookie('auth_token')
      deleteCookie('user')

      // Force reload to clear all state
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Even if backend fails, clear local state
      setUser(null)
      window.location.href = '/login'
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const updatedUser = await AuthService.updateProfile(updates)
      setUser(updatedUser)
    } catch (error: any) {
      throw error
    }
  }

  const deleteAccount = async () => {
    try {
      await AuthService.deleteAccount()
      setUser(null)
      router.push('/registrar')
    } catch (error: any) {
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    deleteAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

// Hook para proteger páginas que requerem autenticação
export function useAuthGuard() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading }
}

// Hook para redirecionar usuários autenticados
export function useGuestGuard() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading }
}
