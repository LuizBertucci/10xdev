'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import supabase, { type User, type RegisterData, type LoginData } from '@/services/auth'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Helper para buscar perfil completo do usuário da tabela users
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, status, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error)
        return null
      }

      if (data) {
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          status: data.status,
          avatarUrl: data.avatar_url
        }
      }

      return null
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      return null
    }
  }

  // Inicializar sessão ao montar
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Erro ao obter sessão:', error)
          setUser(null)
          setIsLoading(false)
          return
        }

        if (session?.user) {
          // Buscar perfil completo da tabela users
          const userProfile = await fetchUserProfile(session.user.id)

          if (userProfile) {
            setUser(userProfile)
          } else {
            // Fallback para dados do auth se perfil não existir
            const userData: User = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || null,
              role: 'user',
              status: 'active'
            }
            setUser(userData)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Erro ao inicializar sessão:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initSession()

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Buscar perfil completo da tabela users
        const userProfile = await fetchUserProfile(session.user.id)

        if (userProfile) {
          setUser(userProfile)
        } else {
          // Fallback para dados do auth
          const userData: User = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || null,
            role: 'user',
            status: 'active'
          }
          setUser(userData)
        }
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = async (data: LoginData) => {
    setIsLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (error) {
        // Traduzir erros comuns do Supabase
        let errorMessage = error.message
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Credenciais inválidas. Verifique seu email e senha.'
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.'
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = 'Email inválido. Por favor, verifique o email e tente novamente.'
        }
        
        const customError: any = new Error(errorMessage)
        customError.originalError = error
        throw customError
      }

      if (authData.user) {
        // Buscar perfil completo após login
        const userProfile = await fetchUserProfile(authData.user.id)

        if (userProfile) {
          setUser(userProfile)
        } else {
          const userData: User = {
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || null,
            role: 'user',
            status: 'active'
          }
          setUser(userData)
        }
      }
    } catch (error: any) {
      console.error('Erro no login:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    setIsLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            full_name: data.name
          }
        }
      })

      if (error) {
        // Traduzir erros comuns do Supabase
        let errorMessage = error.message
        if (error.message?.includes('User already registered') || error.message?.includes('already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login ou use outro email.'
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = 'Email inválido. Por favor, verifique o email e tente novamente.'
        } else if (error.message?.includes('Password')) {
          errorMessage = 'A senha não atende aos requisitos mínimos.'
        }
        
        const customError: any = new Error(errorMessage)
        customError.originalError = error
        throw customError
      }

      if (authData.user) {
        // Buscar perfil completo após registro
        const userProfile = await fetchUserProfile(authData.user.id)

        if (userProfile) {
          setUser(userProfile)
        } else {
          const userData: User = {
            id: authData.user.id,
            email: authData.user.email,
            name: data.name,
            role: 'user',
            status: 'active'
          }
          setUser(userData)
        }
      }
    } catch (error: any) {
      console.error('Erro no registro:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (error: any) {
      console.error('Erro no logout:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (data: Partial<User>) => {
    setIsLoading(true)
    try {
      if (!user) throw new Error('Usuário não autenticado')

      const updateData: any = {}
      if (data.email) updateData.email = data.email
      if (data.name) {
        updateData.data = {
          name: data.name,
          full_name: data.name
        }
      }

      const { data: authData, error } = await supabase.auth.updateUser(updateData)
      if (error) throw error

      if (authData.user) {
        // Buscar perfil completo após atualização
        const userProfile = await fetchUserProfile(authData.user.id)

        if (userProfile) {
          setUser(userProfile)
        } else {
          const userData: User = {
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || null,
            role: user?.role || 'user',
            status: user?.status || 'active'
          }
          setUser(userData)
        }
      }
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = logout

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

