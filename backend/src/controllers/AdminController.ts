import { Request, Response } from 'express'
import { UserModel } from '@/models/UserModel'
import { supabaseAdmin } from '@/database/supabase'

export class AdminController {
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const result = await UserModel.listAllWithCardCounts()
      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({ success: true, data: result.data, count: result.count })
    } catch (error) {
      console.error('Erro no controller listUsers:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  static async setUserStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }

      const { id } = req.params
      const { status } = req.body || {}

      if (!id) {
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }

      if (req.user.id === id) {
        res.status(400).json({ success: false, error: 'Você não pode desativar sua própria conta' })
        return
      }

      if (status !== 'active' && status !== 'inactive') {
        res.status(400).json({ success: false, error: 'Status inválido. Use active ou inactive.' })
        return
      }

      // Atualiza status na tabela public.users
      const result = await UserModel.setStatus(id, status)
      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      // Para "impossibilitar login", também banimos no Supabase Auth quando inactive.
      // Ao reativar, removemos o ban.
      const farFuture = new Date()
      farFuture.setFullYear(farFuture.getFullYear() + 100)

      const update = status === 'inactive'
        ? { banned_until: farFuture.toISOString() }
        : { banned_until: null }

      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(id, update as any)
      if (banError) {
        // Não falha a request inteira: status já foi atualizado, mas avisamos.
        res.status(200).json({
          success: true,
          message: 'Status atualizado, mas falha ao aplicar ban no Auth',
          data: { id, status },
          warning: banError.message
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Status do usuário atualizado com sucesso',
        data: { id, status }
      })
    } catch (error) {
      console.error('Erro no controller setUserStatus:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }
}



