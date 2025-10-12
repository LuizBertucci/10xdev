import { supabase } from '../config/supabase'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

interface SupabaseUser {
  id: string
  email: string
  user_metadata?: {
    name?: string
    full_name?: string
  }
  created_at: string
}

interface AdaptedUser {
  id: number
  email: string
  name: string
  role?: string
  created_at: string
}

interface AuthResponse {
  message: string
  user: AdaptedUser
  token: string
}

interface SupabaseSession {
  access_token: string
  refresh_token: string
  user: SupabaseUser
}

export class SupabaseAuthAdapter {
  private idMapping: Map<string, number> = new Map()

  /**
   * Main adapter method - converts Supabase auth result to legacy format
   */
  async adaptAuthResponse(supabaseAuthResult: {
    user: SupabaseUser
    session: SupabaseSession
  }): Promise<AuthResponse> {
    const { user: supabaseUser, session } = supabaseAuthResult

    // Convert Supabase user format to our application format
    const adaptedUser = await this.adaptUserFormat(supabaseUser)

    // Generate custom JWT token compatible with our system
    const customToken = this._generateCompatibleToken(adaptedUser, session)

    return {
      message: 'Login realizado com sucesso',
      user: adaptedUser,
      token: customToken
    }
  }

  /**
   * Adapts Supabase user format to our application format
   * Maps UUID to BIGINT ID for backward compatibility
   */
  async adaptUserFormat(supabaseUser: SupabaseUser): Promise<AdaptedUser> {
    const bigintId = await this._getBigintIdForUUID(supabaseUser.id)

    // Get user role from database
    const { data: userData } = await supabase
      .from('user')
      .select('role')
      .eq('id', supabaseUser.id)
      .single()

    return {
      id: bigintId,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name ||
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.email?.split('@')[0] || 'User',
      role: userData?.role || 'user',
      created_at: supabaseUser.created_at
    }
  }

  /**
   * Maps Supabase UUID to BIGINT ID
   * Uses caching and database mapping table for consistency
   */
  private async _getBigintIdForUUID(uuid: string): Promise<number> {
    // Check cache first
    if (this.idMapping.has(uuid)) {
      return this.idMapping.get(uuid)!
    }

    // Check database mapping table
    const { data: mapping } = await supabase
      .from('user_id_mapping')
      .select('bigint_id')
      .eq('uuid_id', uuid)
      .single()

    if (mapping) {
      this.idMapping.set(uuid, mapping.bigint_id)
      return mapping.bigint_id
    }

    // Generate new BIGINT ID if not found
    const newBigintId = await this._generateNextBigintId()

    // Store mapping
    await supabase
      .from('user_id_mapping')
      .insert({
        uuid_id: uuid,
        bigint_id: newBigintId
      })

    this.idMapping.set(uuid, newBigintId)
    return newBigintId
  }

  /**
   * Generates next available BIGINT ID
   */
  private async _generateNextBigintId(): Promise<number> {
    const { data } = await supabase
      .from('user_id_mapping')
      .select('bigint_id')
      .order('bigint_id', { ascending: false })
      .limit(1)
      .single()

    return data ? data.bigint_id + 1 : 1
  }

  /**
   * Generates custom JWT token compatible with our legacy system
   * Includes both BIGINT ID and Supabase user ID for compatibility
   */
  private _generateCompatibleToken(
    adaptedUser: AdaptedUser,
    supabaseSession: SupabaseSession
  ): string {
    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    const payload = {
      sub: adaptedUser.id.toString(),
      email: adaptedUser.email,
      name: adaptedUser.name,
      role: adaptedUser.role,
      jti: uuidv4(), // JWT ID for denylist
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      supabase_user_id: supabaseSession.user.id,
      supabase_session_id: supabaseSession.access_token.substring(0, 16)
    }

    return jwt.sign(payload, jwtSecret)
  }

  /**
   * Converts our custom JWT token back to req.user format
   * Used by middleware to extract user info from token
   */
  async adaptTokenToReqUser(token: string): Promise<any> {
    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as any

      return {
        id: parseInt(decoded.sub),
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        jti: decoded.jti,
        supabase_user_id: decoded.supabase_user_id
      }
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  /**
   * Checks if token is valid (not in denylist)
   */
  async isTokenValid(jti: string): Promise<boolean> {
    const { data } = await supabase
      .from('jwt_denylist')
      .select('jti')
      .eq('jti', jti)
      .single()

    return !data // Valid if NOT in denylist
  }

  /**
   * Adds token to denylist (for logout)
   */
  async denyToken(jti: string, exp: number): Promise<void> {
    await supabase
      .from('jwt_denylist')
      .insert({
        jti,
        exp
      })
  }

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

    return this.adaptAuthResponse({
      user: data.user as SupabaseUser,
      session: data.session as SupabaseSession
    })
  }

  /**
   * Register new user
   */
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    })

    if (error) {
      console.error('Supabase signUp error:', error)
      throw new Error(error.message)
    }

    console.log('Supabase signUp response:', {
      hasUser: !!data.user,
      hasSession: !!data.session,
      userId: data.user?.id
    })

    if (!data.user) {
      throw new Error('Falha ao criar usuário')
    }

    // Se não tiver session, tenta login direto (email verification pode estar ativo)
    if (!data.session) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (loginError || !loginData.session) {
        throw new Error('Confirme seu email antes de fazer login')
      }

      return this.adaptAuthResponse({
        user: loginData.user as SupabaseUser,
        session: loginData.session as SupabaseSession
      })
    }

    return this.adaptAuthResponse({
      user: data.user as SupabaseUser,
      session: data.session as SupabaseSession
    })
  }

  /**
   * Get user by Supabase UUID
   */
  async getUserByUUID(uuid: string): Promise<AdaptedUser | null> {
    const { data, error } = await supabase.auth.admin.getUserById(uuid)

    if (error || !data.user) {
      return null
    }

    return this.adaptUserFormat(data.user as SupabaseUser)
  }

  /**
   * Update user profile
   */
  async updateUserProfile(uuid: string, updates: { name?: string; email?: string }): Promise<AdaptedUser> {
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

    return this.adaptUserFormat(data.user as SupabaseUser)
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
}
