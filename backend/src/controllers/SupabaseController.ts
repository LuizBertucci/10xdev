import { Request, Response } from 'express'
import { supabaseAdmin, executeQuery } from '@/database/supabase'

/**
 * Controller de autenticação usando Supabase Auth
 * Usa supabaseAdmin para operações de admin (bypass RLS)
 * Não gera tokens custom - frontend usa tokens do Supabase
 */
export class SupabaseController {
  // ================================================
  // REGISTER - POST /api/auth/register
  // ================================================

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body || {}

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email e senha são obrigatórios'
        })
        return
      }

      // Registrar usuário no Supabase Auth
      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
            full_name: name || email.split('@')[0]
          }
        }
      })

      if (error) {
        console.error('Erro no registro:', error)
        res.status(400).json({
          success: false,
          error: error.message || 'Falha ao registrar usuário. Tente novamente.'
        })
        return
      }

      res.status(201).json({
        success: true,
        message: 'Usuário registrado com sucesso',
        data: {
          id: data.user?.id,
          email: data.user?.email,
          name: name || email.split('@')[0]
        }
      })
    } catch (error: unknown) {
      console.error('Erro no controller register:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // LOGIN - POST /api/auth/login
  // ================================================

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body || {}

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email e senha são obrigatórios'
        })
        return
      }

      // Login no Supabase Auth
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Erro no login:', error)
        res.status(401).json({
          success: false,
          error: 'Credenciais inválidas. Tente novamente.'
        })
        return
      }

      // Não gerar token custom - frontend deve usar access_token do Supabase
      res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.user_metadata?.name || data.user?.user_metadata?.full_name || null
        }
      })
    } catch (error: unknown) {
      console.error('Erro no controller login:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // LOGOUT - DELETE /api/auth/logout
  // ================================================

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // Frontend deve encerrar sessão via supabase-js
      // Este endpoint apenas confirma que o logout foi processado
      res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso'
      })
    } catch (error: unknown) {
      console.error('Erro no controller logout:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // SHOW PROFILE - GET /api/auth/profile
  // ================================================

  static async showProfile(req: Request, res: Response): Promise<void> {
    try {
      // req.user é anexado pelo middleware de autenticação
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Usuário autenticado',
        data: req.user
      })
    } catch (error: unknown) {
      console.error('Erro no controller showProfile:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // UPDATE PROFILE - PUT /api/auth/profile
  // ================================================

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { name, email } = req.body || {}

      // Atualizar no Supabase Auth
      const updateData: any = {}
      if (email) updateData.email = email
      if (name) {
        updateData.data = {
          name,
          full_name: name
        }
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          error: 'Nenhum campo para atualizar'
        })
        return
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        req.user.id,
        updateData
      )

      if (authError) {
        console.error('Erro ao atualizar usuário no auth:', authError)
        res.status(400).json({
          success: false,
          error: authError.message || 'Falha ao atualizar perfil'
        })
        return
      }

      // Atualizar também na tabela users
      const userUpdateData: any = {
        updated_at: new Date().toISOString()
      }
      if (name) userUpdateData.name = name
      if (email) userUpdateData.email = email.toLowerCase()

      try {
        await executeQuery(
          supabaseAdmin
            .from('users')
            .update(userUpdateData)
            .eq('id', req.user.id)
        )
      } catch (dbError: any) {
        console.error('Erro ao atualizar perfil na tabela users:', dbError.message)
        // Continua mesmo com erro - auth já foi atualizado
      }

      res.status(200).json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: {
          id: authData.user.id,
          email: authData.user.email,
          name: name || authData.user.user_metadata?.name || null
        }
      })
    } catch (error: unknown) {
      console.error('Erro no controller updateProfile:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // DELETE ACCOUNT - DELETE /api/auth/profile
  // ================================================

  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      // Deletar usuário no Supabase Auth (isso também remove da tabela users via trigger/cascade se configurado)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user.id)

      if (error) {
        console.error('Erro ao deletar conta:', error)
        res.status(400).json({
          success: false,
          error: error.message || 'Falha ao deletar conta. Tente novamente.'
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Conta deletada com sucesso'
      })
    } catch (error: unknown) {
      console.error('Erro no controller deleteAccount:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }
}
