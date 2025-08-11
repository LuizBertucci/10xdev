'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService, User, LoginData, RegisterData } from '@/services/authService'
import { useToast } from '@/hooks/use-toast'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginData) => Promise<boolean>
  register: (userData: RegisterData) => Promise<boolean>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const isAuthenticated = !!user

  // Initialize auth state
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const response = await authService.getProfile()
        if (response.success) {
          setUser(response.data.user)
        } else {
          // Token might be expired or invalid
          authService.removeToken()
        }
      }
    } catch (error) {
      console.warn('Failed to initialize auth:', error)
      authService.removeToken()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credentials: LoginData): Promise<boolean> => {
    try {
      setIsLoading(true)
      const response = await authService.login(credentials)
      
      if (response.success) {
        setUser(response.data.user)
        toast({
          title: 'Login realizado com sucesso',
          description: `Bem-vindo de volta, ${response.data.user.first_name || response.data.user.email}!`,
        })
        return true
      } else {
        toast({
          title: 'Falha no login',
          description: response.message,
          variant: 'destructive',
        })
        return false
      }
    } catch (error: any) {
      toast({
        title: 'Erro no login',
        description: error.message || 'Ocorreu um erro durante o login',
        variant: 'destructive',
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      setIsLoading(true)
      const response = await authService.register(userData)
      
      if (response.success) {
        setUser(response.data.user)
        toast({
          title: 'Cadastro realizado com sucesso',
          description: `Bem-vindo à 10xDev, ${response.data.user.first_name || response.data.user.email}!`,
        })
        return true
      } else {
        toast({
          title: 'Falha no cadastro',
          description: response.message,
          variant: 'destructive',
        })
        return false
      }
    } catch (error: any) {
      toast({
        title: 'Erro no cadastro',
        description: error.message || 'Ocorreu um erro durante o cadastro',
        variant: 'destructive',
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      await authService.logout()
      setUser(null)
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso',
      })
    } catch (error) {
      console.warn('Logout error:', error)
      // Still clear local state even if server logout fails
      setUser(null)
      authService.removeToken()
    } finally {
      setIsLoading(false)
    }
  }

  const refreshProfile = async () => {
    try {
      const response = await authService.getProfile()
      if (response.success) {
        setUser(response.data.user)
      }
    } catch (error) {
      console.warn('Failed to refresh profile:', error)
      // If profile refresh fails, user might need to re-login
      setUser(null)
      authService.removeToken()
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshProfile,
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