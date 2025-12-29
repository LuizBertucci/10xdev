import { Request, Response } from 'express'
import { UserModel } from '@/models/UserModel'
import { supabaseAdmin, executeQuery } from '@/database/supabase'
import { CardFeatureModel } from '@/models/CardFeatureModel'

export class UserController {
  
  // ================================================
  // SEARCH - GET /api/users/search
  // ================================================
  
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

      if (!query || query.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Search term "q" is required and must be at least 2 characters'
        })
        return
      }

      const result = await UserModel.search(query, limit)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        count: result.count
      })
    } catch (error) {
      console.error('Error in UserController search:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // ================================================
  // CHANGE PASSWORD - POST /api/users/change-password
  // ================================================

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { currentPassword, newPassword } = req.body

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Senha atual e nova senha são obrigatórias'
        })
        return
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          error: 'A nova senha deve ter pelo menos 6 caracteres'
        })
        return
      }

      // Verificar senha atual fazendo login
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword
      })

      if (signInError) {
        res.status(400).json({
          success: false,
          error: 'Senha atual incorreta'
        })
        return
      }

      // Atualizar senha via admin
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        req.user.id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError)
        res.status(400).json({
          success: false,
          error: updateError.message || 'Erro ao atualizar senha'
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Senha alterada com sucesso'
      })
    } catch (error: any) {
      console.error('Error in UserController changePassword:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // MY CARDS - GET /api/users/my-cards
  // ================================================

  static async getMyCards(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

      // Buscar cards criados pelo usuário usando query direta
      const { data, count } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('*', { count: 'exact' })
          .eq('created_by', req.user.id)
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1)
      )

      // Buscar dados do usuário para o campo author
      const { data: userData } = await executeQuery(
        supabaseAdmin
          .from('users')
          .select('id, name, email')
          .eq('id', req.user.id)
          .single()
      )

      // Transformar para formato de resposta
      const transformedData = data?.map((card: any) => ({
        id: card.id,
        title: card.title,
        tech: card.tech,
        language: card.language,
        description: card.description,
        content_type: card.content_type,
        card_type: card.card_type,
        screens: card.screens,
        createdBy: card.created_by,
        author: userData?.name || null,
        isPrivate: card.is_private,
        createdInProjectId: card.created_in_project_id,
        createdAt: card.created_at,
        updatedAt: card.updated_at
      })) || []

      res.status(200).json({
        success: true,
        data: transformedData,
        count: count || 0,
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit)
      })
    } catch (error: any) {
      console.error('Error in UserController getMyCards:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }
}

