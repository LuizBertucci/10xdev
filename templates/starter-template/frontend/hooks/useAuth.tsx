'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import supabase, { type User, type RegisterData, type LoginData } from '@/services/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, status, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      if (error || !data) return null

      return {
        id: data.id,
        email: data.email ?? null,
        name: data.name ?? null,
        role: data.role ?? null,
        status: data.status ?? null,
        avatarUrl: data.avatar_url ?? null
      }
    } catch {
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    const initSession = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!mounted) return

        if (session?.user) {
          const basicUser: User = {
            id: session.user.id,
            email: session.user.email ?? null,
            name: session.user.user_metadata?.name || null,
            role: 'user',
            status: 'active'
          }
          setUser(basicUser)

          fetchUserProfile(session.user.id).then(profile => {
            if (mounted && profile) setUser(profile)
          })
        } else {
          setUser(null)
        }
      } catch {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          name: session.user.user_metadata?.name || null,
          role: 'user',
          status: 'active'
        })

        fetchUserProfile(session.user.id).then(profile => {
          if (mounted && profile) setUser(profile)
        })
      } else if (mounted) {
        setUser(null)
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

      if (error) throw new Error(error.message)

      if (authData.user) {
        setUser({
          id: authData.user.id,
          email: authData.user.email ?? null,
          name: authData.user.user_metadata?.name || null,
          role: 'user',
          status: 'active'
        })

        fetchUserProfile(authData.user.id).then(profile => {
          if (profile) setUser(profile)
        })
      }
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
          data: { name: data.name, full_name: data.name }
        }
      })

      if (error) throw new Error(error.message)

      if (authData.user) {
        setUser({
          id: authData.user.id,
          email: authData.user.email ?? null,
          name: data.name,
          role: 'user',
          status: 'active'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
