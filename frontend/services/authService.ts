import { supabase } from '@/lib/supabase/client'

/**
 * Serviço de autenticação usando Supabase Auth
 * Este serviço pode ser removido no futuro, pois agora usamos Supabase diretamente no AuthContext
 */
class AuthService {
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
   * Traduzir mensagens de erro do Supabase
   */
  handleAuthError(errorMessage: string): string {
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
