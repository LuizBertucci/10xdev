import bcrypt from 'bcryptjs'
import { supabaseAdminTyped, isDevMode } from '../database/supabase'
import jwtService from '../utils/jwtUtils'

export interface User {
  id: string
  email: string
  password_hash: string
  name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
  email_verified: boolean
  last_login: string | null
}

export interface CreateUserData {
  email: string
  password: string
  name: string
  avatar_url?: string
}

export interface UpdateUserData {
  email?: string
  name?: string
  avatar_url?: string
  email_verified?: boolean
  last_login?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: Omit<User, 'password_hash'>
}

class UserModel {
  private JWT_SECRET: string = process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
  private JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key'
  private ACCESS_TOKEN_EXPIRES = '15m' // 15 minutos
  private REFRESH_TOKEN_EXPIRES = '7d' // 7 dias

  constructor() {
    if (isDevMode) {
      console.log('⚠️  [UserModel] Executando em modo desenvolvimento - usando senhas mock')
    }
  }

  /**
   * CRIAR NOVO USUÁRIO
   */
  async createUser(userData: CreateUserData): Promise<User | null> {
    try {
      // Verificar se email já existe
      const existingUser = await this.findByEmail(userData.email)
      if (existingUser) {
        throw new Error('Email já está em uso')
      }

      // Hash da senha
      const password_hash = await bcrypt.hash(userData.password, 12)

      const userToCreate = {
        email: userData.email,
        password_hash,
        name: userData.name,
        avatar_url: userData.avatar_url || null,
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (isDevMode) {
        // Simular criação em desenvolvimento
        const mockUser: User = {
          id: Date.now().toString(),
          ...userToCreate,
          last_login: null
        }
        console.log(`👤 [UserModel] Usuário criado (DEV): ${mockUser.email}`)
        return mockUser
      }

      const { data, error } = await supabaseAdminTyped
        .from('users')
        .insert(userToCreate)
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar usuário:', error)
        return null
      }

      console.log(`✅ [UserModel] Usuário criado: ${data.email}`)
      return {
        ...data,
        avatar_url: data.avatar_url || null,
        last_login: data.last_login || null
      } as User

    } catch (error: any) {
      console.error('Erro ao criar usuário:', error.message)
      throw error
    }
  }

  /**
   * BUSCAR USUÁRIO POR EMAIL
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      if (isDevMode) {
        // Mock users em desenvolvimento
        const mockUsers: User[] = [
          {
            id: '1',
            email: 'admin@10xdev.com',
            password_hash: await bcrypt.hash('123456', 12),
            name: 'Admin 10xDev',
            avatar_url: null,
            email_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: null
          },
          {
            id: '2', 
            email: 'user@10xdev.com',
            password_hash: await bcrypt.hash('123456', 12),
            name: 'Usuário Teste',
            avatar_url: null,
            email_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: null
          }
        ]

        const user = mockUsers.find(u => u.email === email)
        if (user) {
          console.log(`👤 [UserModel] Usuário encontrado (DEV): ${user.email}`)
          return user
        }
        return null
      }

      const { data, error } = await supabaseAdminTyped
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error || !data) {
        return null
      }

      return {
        ...data,
        avatar_url: data.avatar_url || null,
        last_login: data.last_login || null
      } as User

    } catch (error: any) {
      console.error('Erro ao buscar usuário por email:', error.message)
      return null
    }
  }

  /**
   * BUSCAR USUÁRIO POR ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      if (isDevMode) {
        // Mock em desenvolvimento
        if (id === '1') {
          return {
            id: '1',
            email: 'admin@10xdev.com',
            password_hash: await bcrypt.hash('123456', 12),
            name: 'Admin 10xDev',
            avatar_url: null,
            email_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: null
          }
        }
        return null
      }

      const { data, error } = await supabaseAdminTyped
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        return null
      }

      return {
        ...data,
        avatar_url: data.avatar_url || null,
        last_login: data.last_login || null
      } as User

    } catch (error: any) {
      console.error('Erro ao buscar usuário por ID:', error.message)
      return null
    }
  }

  /**
   * VALIDAR SENHA
   */
  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword)
    } catch (error: any) {
      console.error('Erro ao validar senha:', error.message)
      return false
    }
  }

  /**
   * GERAR TOKENS JWT
   */
  generateTokens(user: User): AuthTokens {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified
    }

    // Usar nossa implementação JWT customizada
    const accessToken = jwtService.sign(payload, this.JWT_SECRET, { expiresIn: this.ACCESS_TOKEN_EXPIRES })
    const refreshToken = jwtService.sign(payload, this.JWT_REFRESH_SECRET, { expiresIn: this.REFRESH_TOKEN_EXPIRES })

    const { password_hash, ...userWithoutPassword } = user

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword
    }
  }

  /**
   * VERIFICAR TOKEN JWT
   */
  verifyAccessToken(token: string): any {
    try {
      return jwtService.verify(token, this.JWT_SECRET)
    } catch (error: any) {
      console.error('Token inválido:', error.message)
      return null
    }
  }

  /**
   * VERIFICAR REFRESH TOKEN
   */
  verifyRefreshToken(token: string): any {
    try {
      return jwtService.verify(token, this.JWT_REFRESH_SECRET)
    } catch (error: any) {
      console.error('Refresh token inválido:', error.message)
      return null
    }
  }

  /**
   * FAZER LOGIN
   */
  async login(loginData: LoginData): Promise<AuthTokens | null> {
    try {
      // Buscar usuário
      const user = await this.findByEmail(loginData.email)
      if (!user) {
        throw new Error('Usuário não encontrado')
      }

      // Validar senha
      const isPasswordValid = await this.validatePassword(loginData.password, user.password_hash)
      if (!isPasswordValid) {
        throw new Error('Senha incorreta')
      }

      // Atualizar último login
      await this.updateLastLogin(user.id)

      // Gerar tokens
      const tokens = this.generateTokens(user)
      
      console.log(`🔑 [UserModel] Login realizado: ${user.email}`)
      return tokens

    } catch (error: any) {
      console.error('Erro ao fazer login:', error.message)
      throw error
    }
  }

  /**
   * ATUALIZAR ÚLTIMO LOGIN
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      if (isDevMode) {
        console.log(`⏰ [UserModel] Último login atualizado (DEV): ${userId}`)
        return
      }

      await supabaseAdminTyped
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)

    } catch (error: any) {
      console.error('Erro ao atualizar último login:', error.message)
    }
  }

  /**
   * ATUALIZAR USUÁRIO
   */
  async updateUser(userId: string, updateData: UpdateUserData): Promise<User | null> {
    try {
      if (isDevMode) {
        console.log(`📝 [UserModel] Usuário atualizado (DEV): ${userId}`)
        return await this.findById(userId)
      }

      const { data, error } = await supabaseAdminTyped
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error || !data) {
        console.error('Erro ao atualizar usuário:', error)
        return null
      }

      console.log(`✅ [UserModel] Usuário atualizado: ${data.email}`)
      return {
        ...data,
        avatar_url: data.avatar_url || null,
        last_login: data.last_login || null
      } as User

    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error.message)
      throw error
    }
  }
}

export default new UserModel()