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
          const userData: User = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || null
          }
          setUser(userData)
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
        const userData: User = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || null
        }
        setUser(userData)
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

      if (error) throw error

      if (authData.user) {
        const userData: User = {
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || null
        }
        setUser(userData)
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

      if (error) throw error

      if (authData.user) {
        const userData: User = {
          id: authData.user.id,
          email: authData.user.email,
          name: data.name
        }
        setUser(userData)
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
        const userData: User = {
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || null
        }
        setUser(userData)
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

