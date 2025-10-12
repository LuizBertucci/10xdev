import { Request, Response } from 'express'
import { SupabaseAuthAdapter } from '../adapters/SupabaseAuthAdapter'

const adapter = new SupabaseAuthAdapter()

export class AuthController {
  /**
   * GET /api/auth/registrations
   * Show registration page info
   */
  static async showRegister(req: Request, res: Response): Promise<void> {
    res.json({
      message: 'Endpoint de registro',
      fields: ['name', 'email', 'password']
    })
  }

  /**
   * POST /api/auth/registrations
   * Register new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body

      // Validation
      if (!name || !email || !password) {
        res.status(400).json({
          error: 'Nome, email e senha são obrigatórios'
        })
        return
      }

      if (password.length < 6) {
        res.status(400).json({
          error: 'A senha deve ter no mínimo 6 caracteres'
        })
        return
      }

      // Register via adapter
      const result = await adapter.register(email, password, name)

      res.status(201).json(result)
    } catch (error: any) {
      console.error('Register error:', error)
      res.status(400).json({
        error: error.message || 'Erro ao criar conta'
      })
    }
  }

  /**
   * GET /api/auth/sessions
   * Show login page info
   */
  static async showSessions(req: Request, res: Response): Promise<void> {
    res.json({
      message: 'Endpoint de login',
      fields: ['email', 'password']
    })
  }

  /**
   * POST /api/auth/sessions
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body

      // Validation
      if (!email || !password) {
        res.status(400).json({
          error: 'Email e senha são obrigatórios'
        })
        return
      }

      // Login via adapter
      const result = await adapter.login(email, password)

      res.json(result)
    } catch (error: any) {
      console.error('Login error:', error)
      res.status(401).json({
        error: 'Email ou senha inválidos'
      })
    }
  }

  /**
   * DELETE /api/auth/sessions
   * Logout user (add token to denylist)
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user

      if (!user || !user.jti) {
        res.status(400).json({
          error: 'Token inválido'
        })
        return
      }

      // Add token to denylist
      const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h from now
      await adapter.denyToken(user.jti, exp)

      res.json({
        message: 'Logout realizado com sucesso'
      })
    } catch (error: any) {
      console.error('Logout error:', error)
      res.status(500).json({
        error: 'Erro ao fazer logout'
      })
    }
  }

  /**
   * GET /api/auth/members
   * Get current user profile
   */
  static async showProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user

      if (!user || !user.supabase_user_id) {
        res.status(401).json({
          error: 'Usuário não autenticado'
        })
        return
      }

      // Get fresh user data
      const userData = await adapter.getUserByUUID(user.supabase_user_id)

      if (!userData) {
        res.status(404).json({
          error: 'Usuário não encontrado'
        })
        return
      }

      res.json({
        user: userData
      })
    } catch (error: any) {
      console.error('Show profile error:', error)
      res.status(500).json({
        error: 'Erro ao buscar perfil'
      })
    }
  }

  /**
   * PUT /api/auth/members
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user
      const { name, email } = req.body

      if (!user || !user.supabase_user_id) {
        res.status(401).json({
          error: 'Usuário não autenticado'
        })
        return
      }

      // Update via adapter
      const updatedUser = await adapter.updateUserProfile(user.supabase_user_id, {
        name,
        email
      })

      res.json({
        message: 'Perfil atualizado com sucesso',
        user: updatedUser
      })
    } catch (error: any) {
      console.error('Update profile error:', error)
      res.status(400).json({
        error: error.message || 'Erro ao atualizar perfil'
      })
    }
  }

  /**
   * DELETE /api/auth/members
   * Delete user account
   */
  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user

      if (!user || !user.supabase_user_id) {
        res.status(401).json({
          error: 'Usuário não autenticado'
        })
        return
      }

      // Delete via adapter
      await adapter.deleteUser(user.supabase_user_id)

      // Also add current token to denylist
      if (user.jti) {
        const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        await adapter.denyToken(user.jti, exp)
      }

      res.json({
        message: 'Conta deletada com sucesso'
      })
    } catch (error: any) {
      console.error('Delete account error:', error)
      res.status(500).json({
        error: 'Erro ao deletar conta'
      })
    }
  }
}
