import { Request, Response } from 'express'
import { supabase, supabaseAdmin } from '../database/supabase'
import { AuthRequest } from '../middleware/authMiddleware'

/**
 * Controller de autenticação usando Supabase Auth
 */
class AuthController {
  /**
   * Registrar novo usuário
   */
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email e senha são obrigatórios'
        })
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: name || null
        }
      })

      if (error) {
        return res.status(400).json({
          error: error.message
        })
      }

      // Fazer login automático após registro
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        return res.status(400).json({
          error: signInError.message
        })
      }

      return res.status(201).json({
        user: signInData.user,
        session: signInData.session
      })
    } catch (error) {
      console.error('Erro ao registrar usuário:', error)
      return res.status(500).json({
        error: 'Erro ao registrar usuário'
      })
    }
  }

  /**
   * Login de usuário
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email e senha são obrigatórios'
        })
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return res.status(401).json({
          error: 'Credenciais inválidas'
        })
      }

      return res.status(200).json({
        user: data.user,
        session: data.session
      })
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      return res.status(500).json({
        error: 'Erro ao fazer login'
      })
    }
  }

  /**
   * Logout de usuário
   */
  async logout(req: AuthRequest, res: Response) {
    try {
      if (!req.token) {
        return res.status(401).json({
          error: 'Token não fornecido'
        })
      }

      const { error } = await supabaseAdmin.auth.admin.signOut(req.token)

      if (error) {
        return res.status(400).json({
          error: error.message
        })
      }

      return res.status(200).json({
        message: 'Logout realizado com sucesso'
      })
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      return res.status(500).json({
        error: 'Erro ao fazer logout'
      })
    }
  }

  /**
   * Obter perfil do usuário autenticado
   */
  async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuário não autenticado'
        })
      }

      return res.status(200).json({
        user: req.user
      })
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      return res.status(500).json({
        error: 'Erro ao buscar perfil'
      })
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.token) {
        return res.status(401).json({
          error: 'Usuário não autenticado'
        })
      }

      const { name, email } = req.body

      const updateData: any = {}

      if (email) updateData.email = email
      if (name !== undefined) updateData.user_metadata = { name }

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        req.user.id,
        updateData
      )

      if (error) {
        return res.status(400).json({
          error: error.message
        })
      }

      return res.status(200).json({
        user: data.user,
        message: 'Perfil atualizado com sucesso'
      })
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      return res.status(500).json({
        error: 'Erro ao atualizar perfil'
      })
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body

      if (!refresh_token) {
        return res.status(400).json({
          error: 'Refresh token é obrigatório'
        })
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token
      })

      if (error) {
        return res.status(401).json({
          error: 'Token inválido ou expirado'
        })
      }

      return res.status(200).json({
        session: data.session
      })
    } catch (error) {
      console.error('Erro ao renovar token:', error)
      return res.status(500).json({
        error: 'Erro ao renovar token'
      })
    }
  }

  /**
   * Solicitar recuperação de senha
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body

      if (!email) {
        return res.status(400).json({
          error: 'Email é obrigatório'
        })
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
      })

      if (error) {
        return res.status(400).json({
          error: error.message
        })
      }

      return res.status(200).json({
        message: 'Email de recuperação enviado'
      })
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error)
      return res.status(500).json({
        error: 'Erro ao solicitar recuperação de senha'
      })
    }
  }

  /**
   * Redefinir senha
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { password } = req.body
      const authHeader = req.headers.authorization

      if (!password) {
        return res.status(400).json({
          error: 'Nova senha é obrigatória'
        })
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Token não fornecido'
        })
      }

      const token = authHeader.substring(7)

      // Verificar se o token é válido
      const { data: { user }, error: getUserError } = await supabase.auth.getUser(token)

      if (getUserError || !user) {
        return res.status(401).json({
          error: 'Token inválido ou expirado'
        })
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password }
      )

      if (error) {
        return res.status(400).json({
          error: error.message
        })
      }

      return res.status(200).json({
        message: 'Senha redefinida com sucesso'
      })
    } catch (error) {
      console.error('Erro ao redefinir senha:', error)
      return res.status(500).json({
        error: 'Erro ao redefinir senha'
      })
    }
  }
}

export const authController = new AuthController()
