import { Request, Response } from 'express'
import UserModel, { CreateUserData, LoginData } from '../models/UserModel'
import JWTBlacklistModel from '../models/JWTBlacklistModel'
import jwtService from '../utils/jwtUtils'

/**
 * AUTH CONTROLLER - Sistema Completo de Autenticação JWT
 * 
 * Funcionalidades:
 * - Registro de novos usuários
 * - Login com validação de credenciais
 * - Logout com invalidação de tokens
 * - Refresh de tokens
 * - Validação de tokens
 * - Perfil do usuário autenticado
 */

interface AuthenticatedRequest extends Request {
  user?: any
}

class AuthController {
  constructor() {
    console.log('🔐 [AuthController] Sistema de autenticação iniciado')
  }

  /**
   * REGISTRO DE NOVO USUÁRIO
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      console.log('👤 [Auth] Tentativa de registro:', req.body.email)

      const { email, password, name, avatar_url } = req.body

      // Validação de entrada
      if (!email || !password || !name) {
        res.status(400).json({
          success: false,
          error: 'Email, senha e nome são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        })
        return
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Formato de email inválido',
          code: 'INVALID_EMAIL'
        })
        return
      }

      // Validar força da senha
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Senha deve ter pelo menos 6 caracteres',
          code: 'WEAK_PASSWORD'
        })
        return
      }

      // Validar comprimento do nome
      if (name.length < 2 || name.length > 100) {
        res.status(400).json({
          success: false,
          error: 'Nome deve ter entre 2 e 100 caracteres',
          code: 'INVALID_NAME'
        })
        return
      }

      const userData: CreateUserData = {
        email: email.toLowerCase().trim(),
        password,
        name: name.trim(),
        avatar_url: avatar_url || undefined
      }

      // Criar usuário
      const user = await UserModel.createUser(userData)
      if (!user) {
        res.status(500).json({
          success: false,
          error: 'Erro interno ao criar usuário',
          code: 'USER_CREATION_FAILED'
        })
        return
      }

      // Gerar tokens
      const tokens = UserModel.generateTokens(user)

      console.log(`✅ [Auth] Usuário registrado com sucesso: ${user.email}`)

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          user: tokens.user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      })

    } catch (error: any) {
      console.error('❌ [Auth Register] Erro:', error.message)

      // Tratar erro de email duplicado
      if (error.message.includes('Email já está em uso')) {
        res.status(409).json({
          success: false,
          error: 'Este email já está cadastrado',
          code: 'EMAIL_ALREADY_EXISTS'
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * LOGIN DO USUÁRIO
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔑 [Auth] Tentativa de login:', req.body.email)

      const { email, password } = req.body

      // Validação de entrada
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email e senha são obrigatórios',
          code: 'MISSING_CREDENTIALS'
        })
        return
      }

      const loginData: LoginData = {
        email: email.toLowerCase().trim(),
        password
      }

      // Fazer login
      const tokens = await UserModel.login(loginData)
      if (!tokens) {
        res.status(401).json({
          success: false,
          error: 'Credenciais inválidas',
          code: 'INVALID_CREDENTIALS'
        })
        return
      }

      console.log(`✅ [Auth] Login realizado com sucesso: ${tokens.user.email}`)

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: tokens.user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      })

    } catch (error: any) {
      console.error('❌ [Auth Login] Erro:', error.message)

      // Tratar erros específicos
      if (error.message.includes('Usuário não encontrado')) {
        res.status(401).json({
          success: false,
          error: 'Email não cadastrado',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      if (error.message.includes('Senha incorreta')) {
        res.status(401).json({
          success: false,
          error: 'Senha incorreta',
          code: 'WRONG_PASSWORD'
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * LOGOUT DO USUÁRIO
   * POST /api/auth/logout
   */
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        res.status(400).json({
          success: false,
          error: 'Token de acesso é obrigatório para logout',
          code: 'MISSING_TOKEN'
        })
        return
      }

      const token = authHeader.replace('Bearer ', '')
      const refreshToken = req.body.refreshToken

      console.log(`🚪 [Auth] Logout iniciado para token: ${token.substring(0, 20)}...`)

      // Decodificar token para obter informações do usuário
      let userInfo: any = null
      try {
        userInfo = UserModel.verifyAccessToken(token)
      } catch (tokenError) {
        // Token pode estar expirado, mas ainda queremos fazer logout
        console.log('⚠️ [Auth] Token expirado durante logout, prosseguindo...')
      }

      // Adicionar tokens à blacklist
      const promises: Promise<boolean>[] = []

      // Access token
      promises.push(JWTBlacklistModel.addToBlacklist({
        token,
        user_id: userInfo?.id || 'unknown',
        expires_at: userInfo?.exp ? new Date(userInfo.exp * 1000).toISOString() : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        reason: 'logout'
      }))

      // Refresh token (se fornecido)
      if (refreshToken) {
        let refreshInfo: any = null
        try {
          refreshInfo = UserModel.verifyRefreshToken(refreshToken)
        } catch (refreshError) {
          console.log('⚠️ [Auth] Refresh token inválido durante logout')
        }

        promises.push(JWTBlacklistModel.addToBlacklist({
          token: refreshToken,
          user_id: refreshInfo?.id || userInfo?.id || 'unknown',
          expires_at: refreshInfo?.exp ? new Date(refreshInfo.exp * 1000).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'logout'
        }))
      }

      // Executar todas as operações de blacklist
      const results = await Promise.all(promises)
      const allSuccess = results.every(result => result === true)

      if (!allSuccess) {
        console.error('⚠️ [Auth] Nem todos os tokens foram adicionados à blacklist')
      }

      console.log(`✅ [Auth] Logout realizado com sucesso para: ${userInfo?.email || 'usuário desconhecido'}`)

      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      })

    } catch (error: any) {
      console.error('❌ [Auth Logout] Erro:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * REFRESH TOKEN
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token é obrigatório',
          code: 'MISSING_REFRESH_TOKEN'
        })
        return
      }

      console.log(`🔄 [Auth] Tentativa de refresh token: ${refreshToken.substring(0, 20)}...`)

      // Verificar se o token está na blacklist
      const isBlacklisted = await JWTBlacklistModel.isBlacklisted(refreshToken)
      if (isBlacklisted) {
        res.status(401).json({
          success: false,
          error: 'Token inválido ou revogado',
          code: 'TOKEN_BLACKLISTED'
        })
        return
      }

      // Verificar validade do refresh token
      const tokenPayload = UserModel.verifyRefreshToken(refreshToken)
      if (!tokenPayload) {
        res.status(401).json({
          success: false,
          error: 'Refresh token inválido ou expirado',
          code: 'INVALID_REFRESH_TOKEN'
        })
        return
      }

      // Buscar usuário atual
      const user = await UserModel.findById(tokenPayload.id)
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Gerar novos tokens
      const newTokens = UserModel.generateTokens(user)

      // Invalidar o refresh token antigo
      await JWTBlacklistModel.addToBlacklist({
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(tokenPayload.exp * 1000).toISOString(),
        reason: 'refresh'
      })

      console.log(`✅ [Auth] Tokens atualizados com sucesso: ${user.email}`)

      res.json({
        success: true,
        message: 'Tokens atualizados com sucesso',
        data: {
          user: newTokens.user,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken
        }
      })

    } catch (error: any) {
      console.error('❌ [Auth Refresh] Erro:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * PERFIL DO USUÁRIO AUTENTICADO
   * GET /api/auth/me
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
          code: 'NOT_AUTHENTICATED'
        })
        return
      }

      // Buscar dados atualizados do usuário
      const currentUser = await UserModel.findById(user.id)
      if (!currentUser) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Remover password_hash dos dados retornados
      const { password_hash, ...userProfile } = currentUser

      res.json({
        success: true,
        data: {
          user: userProfile
        }
      })

    } catch (error: any) {
      console.error('❌ [Auth Profile] Erro:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * VALIDAR TOKEN
   * POST /api/auth/validate
   */
  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Token é obrigatório',
          code: 'MISSING_TOKEN'
        })
        return
      }

      // Verificar se está na blacklist
      const isBlacklisted = await JWTBlacklistModel.isBlacklisted(token)
      if (isBlacklisted) {
        res.status(401).json({
          success: false,
          error: 'Token inválido ou revogado',
          code: 'TOKEN_BLACKLISTED',
          valid: false
        })
        return
      }

      // Verificar validade do token
      const tokenPayload = UserModel.verifyAccessToken(token)
      if (!tokenPayload) {
        res.status(401).json({
          success: false,
          error: 'Token inválido ou expirado',
          code: 'INVALID_TOKEN',
          valid: false
        })
        return
      }

      res.json({
        success: true,
        valid: true,
        data: {
          user: {
            id: tokenPayload.id,
            email: tokenPayload.email,
            name: tokenPayload.name,
            email_verified: tokenPayload.email_verified
          },
          exp: tokenPayload.exp,
          iat: tokenPayload.iat
        }
      })

    } catch (error: any) {
      console.error('❌ [Auth Validate] Erro:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }
}

export default new AuthController()