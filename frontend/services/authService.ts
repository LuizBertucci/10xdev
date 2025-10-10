import { supabase } from '@/lib/supabase/client'
import {
  SignUpData,
  SignInData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthResult,
  UserProfile
} from '@/types/auth'

/**
 * Serviço de autenticação usando Supabase Auth
 */
class AuthService {
  /**
   * Criar nova conta
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const { email, password, firstName, lastName } = data

      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        return {
          success: false,
          error: this.handleAuthError(error.message),
        }
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Erro ao criar conta',
        }
      }

      return {
        success: true,
        user: authData.user,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Fazer login
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const { email, password } = data

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return {
          success: false,
          error: this.handleAuthError(error.message),
        }
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Erro ao fazer login',
        }
      }

      return {
        success: true,
        user: authData.user,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Fazer logout
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  /**
   * Solicitar recuperação de senha
   */
  async forgotPassword(data: ForgotPasswordData): Promise<AuthResult> {
    try {
      const { email } = data

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        return {
          success: false,
          error: this.handleAuthError(error.message),
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Redefinir senha
   */
  async resetPassword(data: ResetPasswordData): Promise<AuthResult> {
    try {
      const { password } = data

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        return {
          success: false,
          error: this.handleAuthError(error.message),
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Obter usuário atual
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  /**
   * Obter sessão atual
   */
  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  /**
   * Buscar perfil do usuário
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<AuthResult> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          avatar_url: updates.avatarUrl,
        })
        .eq('id', userId)

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Traduzir mensagens de erro do Supabase
   */
  private handleAuthError(errorMessage: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Email ou senha incorretos',
      'User already registered': 'Este email já está cadastrado',
      'Email not confirmed': 'Por favor, confirme seu email',
      'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres',
      'Unable to validate email address': 'Email inválido',
    }

    return errorMap[errorMessage] || errorMessage
  }
}

export const authService = new AuthService()
