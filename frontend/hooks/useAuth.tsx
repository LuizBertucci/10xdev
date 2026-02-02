'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import supabase, { type User, type RegisterData, type LoginData } from '@/services/auth'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isProfileLoaded: boolean
  isAuthenticated: boolean
  login: (data: LoginData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cache em memória para evitar requisições repetidas do mesmo perfil
const profileCache = new Map<string, { profile: User; timestamp: number }>()
const PROFILE_CACHE_TTL = 30 * 1000 // 30 segundos

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileLoaded, setIsProfileLoaded] = useState(false)

  // Helper memoizado para buscar perfil completo do usuário da tabela users
  const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    // Verifica cache primeiro
    const cached = profileCache.get(userId)
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL) {
      return cached.profile
    }

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
        const userData = data as {
          id: string
          email: string | null
          name: string | null
          role: string | null
          status: string | null
          avatar_url: string | null
        }

        const profile: User = {
          id: userData.id,
          email: userData.email ?? null,
          name: userData.name ?? null,
          role: userData.role ?? null,
          status: userData.status ?? null,
          avatarUrl: userData.avatar_url ?? null
        }

        // Salva no cache
        profileCache.set(userId, { profile, timestamp: Date.now() })

        return profile
      }

      return null
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      return null
    }
  }, [])

  // Inicializar sessão ao montar
  useEffect(() => {
    let mounted = true

    const initSession = async () => {
      // Marca loading durante a checagem inicial de sessão
      if (mounted) setIsLoading(true)
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Erro ao obter sessão:', error)
          setUser(null)
          return
        }

        if (session?.user) {
          setIsProfileLoaded(false)
          // Define dados básicos do auth imediatamente
          const basicUserData: User = {
            id: session.user.id,
            email: session.user.email ?? null,
            name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || null,
            role: 'user',
            status: 'active'
          }
          setUser(basicUserData)

          // Busca perfil completo em background (não pode travar o fluxo de login)
          fetchUserProfile(session.user.id)
            .then(profile => {
              if (mounted && profile) setUser(profile)
            })
            .catch(err => console.error('Erro ao buscar perfil completo:', err))
            .finally(() => {
              if (mounted) setIsProfileLoaded(true)
            })
        } else {
          setUser(null)
          setIsProfileLoaded(true)
        }
      } catch (error) {
        console.error('Erro ao inicializar sessão:', error)
        if (mounted) {
          setUser(null)
        }
        if (mounted) setIsProfileLoaded(true)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    initSession()

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // SIGNED_OUT: limpa tudo
      if (event === 'SIGNED_OUT') {
        console.log('[useAuth] Sessão encerrada, limpando estado')
        setUser(null)
        setIsProfileLoaded(true)
        return
      }

      // TOKEN_REFRESHED sem sessão: sessão foi invalidada
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('[useAuth] Token refresh falhou, limpando estado')
        setUser(null)
        setIsProfileLoaded(true)
        return
      }

      // TOKEN_REFRESHED: mantém estado atual, não faz nada
      // O estado do usuário deve permanecer constante até o logout
      if (event === 'TOKEN_REFRESHED') {
        return
      }

      // SIGNED_IN: só processa se ainda não temos perfil carregado
      // Evita re-renders desnecessários que causam flicker
      if (event === 'SIGNED_IN' && session?.user) {
        // Se já temos perfil carregado, mantém o estado atual
        if (isProfileLoaded && user?.id === session.user.id) {
          return
        }

        // Se não temos perfil ainda, busca em background (sem resetar estado)
        if (!isProfileLoaded) {
          fetchUserProfile(session.user.id)
            .then(profile => {
              if (mounted && profile) {
                setUser(profile)
                setIsProfileLoaded(true)
              }
            })
            .catch(err => console.error('Erro ao buscar perfil:', err))
        }
      }
    })

    return () => {
      mounted = false
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
        } else if (error.message?.includes('Request rate limit') || error.message?.includes('rate limit')) {
          errorMessage = 'Muitas tentativas de login. Por favor, aguarde alguns minutos antes de tentar novamente.'
        }
        
        const customError: any = new Error(errorMessage)
        customError.originalError = error
        throw customError
      }

      if (authData.user) {
        setIsProfileLoaded(false)
        // Igual à main: não bloquear login com chamadas extras
        setUser({
            id: authData.user.id,
            email: authData.user.email ?? null,
            name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || null,
            role: 'user',
            status: 'active'
        })

        // Atualiza role/status em background
        fetchUserProfile(authData.user.id)
          .then(profile => {
            if (profile) setUser(profile)
          })
          .catch(err => console.error('Erro ao buscar perfil completo:', err))
          .finally(() => setIsProfileLoaded(true))
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
        } else if (error.message?.includes('Request rate limit') || error.message?.includes('rate limit')) {
          errorMessage = 'Muitas tentativas de registro. Por favor, aguarde alguns minutos antes de tentar novamente.'
        }
        
        const customError: any = new Error(errorMessage)
        customError.originalError = error
        throw customError
      }

      if (authData.user) {
        setIsProfileLoaded(false)
        setUser({
            id: authData.user.id,
            email: authData.user.email ?? null,
            name: data.name,
            role: 'user',
            status: 'active'
        })

        fetchUserProfile(authData.user.id)
          .then(profile => {
            if (profile) setUser(profile)
          })
          .catch(err => console.error('Erro ao buscar perfil completo:', err))
          .finally(() => setIsProfileLoaded(true))
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
      // Limpa cache e estado
      profileCache.clear()
      setUser(null)
      setIsProfileLoaded(true)
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
            email: authData.user.email ?? null,
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
    isProfileLoaded,
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

