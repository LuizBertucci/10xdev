import { Request, Response } from 'express'
import { supabase, supabaseAdmin } from '../database/supabase'
import { AuthRequest } from '../middleware/authMiddleware'

class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' })
      }

      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || null }
      })

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      // Login automático após registro
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        return res.status(400).json({ error: signInError.message })
      }

      return res.status(201).json({
        user: signInData.user,
        session: signInData.session
      })
    } catch (error) {
      console.error('Erro ao registrar:', error)
      return res.status(500).json({ error: 'Erro ao registrar usuário' })
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' })
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return res.status(401).json({ error: 'Credenciais inválidas' })
      }

      return res.status(200).json({
        user: data.user,
        session: data.session
      })
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      return res.status(500).json({ error: 'Erro ao fazer login' })
    }
  }

  async logout(req: AuthRequest, res: Response) {
    try {
      if (!req.token) {
        return res.status(401).json({ error: 'Token não fornecido' })
      }

      const { error } = await supabaseAdmin.auth.admin.signOut(req.token)

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      return res.status(200).json({ message: 'Logout realizado com sucesso' })
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      return res.status(500).json({ error: 'Erro ao fazer logout' })
    }
  }

  async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      return res.status(200).json({ user: req.user })
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      return res.status(500).json({ error: 'Erro ao buscar perfil' })
    }
  }
}

export const authController = new AuthController()
