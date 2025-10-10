'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { authService } from '@/services/authService'
import {
  AuthContextType,
  AuthState,
  SignUpData,
  SignInData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthResult,
  UserProfile
} from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Provider de autenticação
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  })

  useEffect(() => {
    // Verificar sessão inicial
    const initializeAuth = async () => {
      try {
        const session = await authService.getCurrentSession()
        const user = await authService.getCurrentUser()

        if (user && session) {
          const profile = await authService.getUserProfile(user.id)
          setState({
            user: { ...user, profile: profile || undefined },
            session,
            loading: false,
            initialized: true,
          })
        } else {
          setState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          })
        }
      } catch (error) {
        setState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
        })
      }
    }

    initializeAuth()

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await authService.getUserProfile(session.user.id)
          setState({
            user: { ...session.user, profile: profile || undefined },
            session,
            loading: false,
            initialized: true,
          })
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          })
        } else if (event === 'USER_UPDATED' && session?.user) {
          const profile = await authService.getUserProfile(session.user.id)
          setState({
            user: { ...session.user, profile: profile || undefined },
            session,
            loading: false,
            initialized: true,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (data: SignUpData): Promise<AuthResult> => {
    setState(prev => ({ ...prev, loading: true }))
    const result = await authService.signUp(data)
    setState(prev => ({ ...prev, loading: false }))

    if (result.success) {
      router.push('/auth/verify-email')
    }

    return result
  }

  const signIn = async (data: SignInData): Promise<AuthResult> => {
    setState(prev => ({ ...prev, loading: true }))
    const result = await authService.signIn(data)
    setState(prev => ({ ...prev, loading: false }))

    if (result.success) {
      router.push('/dashboard')
    }

    return result
  }

  const signOut = async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }))
    await authService.signOut()
    setState(prev => ({ ...prev, loading: false }))
    router.push('/login')
  }

  const forgotPassword = async (data: ForgotPasswordData): Promise<AuthResult> => {
    return authService.forgotPassword(data)
  }

  const resetPassword = async (data: ResetPasswordData): Promise<AuthResult> => {
    return authService.resetPassword(data)
  }

  const updateProfile = async (data: Partial<UserProfile>): Promise<AuthResult> => {
    if (!state.user) {
      return { success: false, error: 'Usuário não autenticado' }
    }
    return authService.updateUserProfile(state.user.id, data)
  }

  const refreshSession = async (): Promise<void> => {
    const session = await authService.getCurrentSession()
    const user = await authService.getCurrentUser()

    if (user && session) {
      const profile = await authService.getUserProfile(user.id)
      setState({
        user: { ...user, profile: profile || undefined },
        session,
        loading: false,
        initialized: true,
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        forgotPassword,
        resetPassword,
        updateProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook para acessar o contexto de autenticação
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
