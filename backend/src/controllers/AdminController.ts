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

      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(id, update as Record<string, unknown>)
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

  static async setUserRole(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }

      const { id } = req.params
      const { role } = req.body || {}

      if (!id) {
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }

      // Proteção: evitar self-modification
      if (req.user.id === id) {
        res.status(400).json({ success: false, error: 'Você não pode alterar sua própria role' })
        return
      }

      if (role !== 'admin' && role !== 'user') {
        res.status(400).json({ success: false, error: 'Role inválida. Use admin ou user.' })
        return
      }

      const result = await UserModel.setRole(id, role)
      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Role do usuário atualizada com sucesso',
        data: { id, role }
      })
    } catch (error) {
      console.error('Erro no controller setUserRole:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }

      const { id } = req.params
      if (!id) {
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }

      // Proteção: evitar se auto-deletar por acidente
      if (req.user.id === id) {
        res.status(400).json({ success: false, error: 'Você não pode excluir sua própria conta' })
        return
      }

      // 1) Anonimiza cards
      const anon = await UserModel.anonymizeCards(id)
      if (!anon.success) {
        res.status(anon.statusCode || 400).json({ success: false, error: anon.error })
        return
      }

      // 2) Deleta projetos criados pelo usuário (e dependências)
      const delProjects = await UserModel.deleteProjectsByCreator(id)
      if (!delProjects.success) {
        res.status(delProjects.statusCode || 400).json({ success: false, error: delProjects.error })
        return
      }

      // 3) Limpa referências (shares/memberships/etc)
      const cleanup = await UserModel.cleanupUserRefs(id)
      if (!cleanup.success) {
        res.status(cleanup.statusCode || 400).json({ success: false, error: cleanup.error })
        return
      }

      // 4) Deleta no Supabase Auth
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id)
      if (authErr) {
        res.status(400).json({ success: false, error: authErr.message || 'Falha ao deletar usuário no Auth' })
        return
      }

      // 5) Garantir remoção do profile (se trigger não remover, removemos aqui)
      await UserModel.deleteProfileRow(id)

      res.status(200).json({
        success: true,
        message: 'Usuário excluído com sucesso',
        data: {
          id,
          anonymizedCards: anon.data?.updatedCount ?? 0,
          deletedProjects: delProjects.data?.deletedProjects ?? 0
        }
      })
    } catch (error: unknown) {
      console.error('Erro no controller deleteUser:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }
}




