import { supabase } from '../config/supabase'

interface SupabaseUser {
  id: string
  email: string
  user_metadata?: {
    name?: string
    full_name?: string
  }
  created_at: string
}

interface AuthResponse {
  message: string
  user: {
    id: string
    email: string
    name: string
    role?: string
    created_at: string
  }
  token: string
}

export class SupabaseAuthAdapter {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!data.user || !data.session) {
      throw new Error('Login falhou')
    }

    // Get user role from database
    const { data: userData } = await supabase
      .from('user')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return {
      message: 'Login realizado com sucesso',
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name ||
              data.user.user_metadata?.full_name ||
              data.user.email?.split('@')[0] || 'User',
        role: userData?.role || 'user',
        created_at: data.user.created_at
      },
      token: data.session.access_token
    }
  }

  /**
   * Register new user
   */
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error('Falha ao criar usuário')
    }

    // If no session, try login (email verification might be required)
    if (!data.session) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (loginError || !loginData.session) {
        throw new Error('Confirme seu email antes de fazer login')
      }

      const { data: userData } = await supabase
        .from('user')
        .select('role')
        .eq('id', loginData.user.id)
        .single()

      return {
        message: 'Conta criada com sucesso',
        user: {
          id: loginData.user.id,
          email: loginData.user.email || '',
          name: loginData.user.user_metadata?.name || name,
          role: userData?.role || 'user',
          created_at: loginData.user.created_at
        },
        token: loginData.session.access_token
      }
    }

    const { data: userData } = await supabase
      .from('user')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return {
      message: 'Conta criada com sucesso',
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || name,
        role: userData?.role || 'user',
        created_at: data.user.created_at
      },
      token: data.session.access_token
    }
  }

  /**
   * Get user by Supabase UUID
   */
  async getUserByUUID(uuid: string): Promise<any | null> {
    const { data, error } = await supabase.auth.admin.getUserById(uuid)

    if (error || !data.user) {
      return null
    }

    const { data: userData } = await supabase
      .from('user')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name ||
            data.user.user_metadata?.full_name ||
            data.user.email?.split('@')[0] || 'User',
      role: userData?.role || 'user',
      created_at: data.user.created_at
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(uuid: string, updates: { name?: string; email?: string }): Promise<any> {
    const updateData: any = {}

    if (updates.email) {
      updateData.email = updates.email
    }

    if (updates.name) {
      updateData.user_metadata = { name: updates.name }
    }

    const { data, error } = await supabase.auth.admin.updateUserById(uuid, updateData)

    if (error || !data.user) {
      throw new Error('Falha ao atualizar perfil')
    }

    const { data: userData } = await supabase
      .from('user')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name ||
            data.user.user_metadata?.full_name ||
            data.user.email?.split('@')[0] || 'User',
      role: userData?.role || 'user',
      created_at: data.user.created_at
    }
  }

  /**
   * Delete user account
   */
  async deleteUser(uuid: string): Promise<void> {
    const { error } = await supabase.auth.admin.deleteUser(uuid)

    if (error) {
      throw new Error('Falha ao deletar conta')
    }
  }

  /**
   * Verify token and get user
   */
  async verifyToken(token: string): Promise<any> {
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      throw new Error('Token inválido')
    }

    const { data: userData } = await supabase
      .from('user')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name ||
            data.user.user_metadata?.full_name ||
            data.user.email?.split('@')[0] || 'User',
      role: userData?.role || 'user',
      supabase_user_id: data.user.id
    }
  }
}
