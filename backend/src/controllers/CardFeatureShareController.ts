import { Request, Response } from 'express'
import { supabaseAdmin, executeQuery } from '@/database/supabase'
import { CardFeatureModel } from '@/models/CardFeatureModel'

export class CardFeatureShareController {
  
  // ================================================
  // SHARE WITH USERS - POST /api/card-features/:id/share
  // ================================================
  
  static async shareWithUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id: cardId } = req.params
      const { emails } = req.body
      const userId = req.user.id

      if (!cardId) {
        res.status(400).json({
          success: false,
          error: 'ID do card é obrigatório'
        })
        return
      }

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Lista de emails é obrigatória e deve ser um array não vazio'
        })
        return
      }

      // Verificar se o card existe e se o usuário é o dono
      const cardResult = await CardFeatureModel.findById(cardId, userId)
      if (!cardResult.success || !cardResult.data) {
        res.status(404).json({
          success: false,
          error: 'Card não encontrado'
        })
        return
      }

      const card = cardResult.data
      if (card.createdBy !== userId) {
        res.status(403).json({
          success: false,
          error: 'Apenas o criador do card pode compartilhá-lo'
        })
        return
      }

      // Buscar IDs dos usuários pelos emails
      const { data: users, error: usersError } = await executeQuery(
        supabaseAdmin
          .from('users')
          .select('id, email')
          .in('email', emails)
      )

      if (usersError) {
        throw usersError
      }

      if (!users || users.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Nenhum usuário encontrado com os emails fornecidos'
        })
        return
      }

      const userIdsToShare = users.map((u: any) => u.id)

      // Buscar shared_with_user_ids atual do card
      const { data: currentCard } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('shared_with_user_ids')
          .eq('id', cardId)
          .single()
      )

      // Obter array atual (pode ser null ou array vazio)
      let currentSharedIds: string[] = []
      if (currentCard?.shared_with_user_ids) {
        if (Array.isArray(currentCard.shared_with_user_ids)) {
          currentSharedIds = currentCard.shared_with_user_ids
        } else if (typeof currentCard.shared_with_user_ids === 'string') {
          try {
            currentSharedIds = JSON.parse(currentCard.shared_with_user_ids)
          } catch {
            currentSharedIds = []
          }
        }
      }

      // Combinar arrays e remover duplicatas
      const updatedSharedIds = [...new Set([...currentSharedIds, ...userIdsToShare])]

      // Atualizar shared_with_user_ids no banco
      const { data: updated, error: updateError } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .update({
            shared_with_user_ids: updatedSharedIds,
            updated_at: new Date().toISOString()
          })
          .eq('id', cardId)
          .select()
          .single()
      )

      if (updateError) {
        throw updateError
      }

      res.status(200).json({
        success: true,
        data: {
          cardId,
          sharedWithUserIds: updatedSharedIds,
          addedUsers: userIdsToShare.length
        },
        message: `Card compartilhado com ${userIdsToShare.length} usuário(s)`
      })
    } catch (error: any) {
      console.error('Erro no controller shareWithUsers:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // UNSHARE WITH USER - DELETE /api/card-features/:id/share/:userId
  // ================================================
  
  static async unshareWithUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id: cardId, userId: userIdToRemove } = req.params
      const userId = req.user.id

      if (!cardId || !userIdToRemove) {
        res.status(400).json({
          success: false,
          error: 'ID do card e ID do usuário são obrigatórios'
        })
        return
      }

      // Verificar se o card existe e se o usuário é o dono
      const cardResult = await CardFeatureModel.findById(cardId, userId)
      if (!cardResult.success || !cardResult.data) {
        res.status(404).json({
          success: false,
          error: 'Card não encontrado'
        })
        return
      }

      const card = cardResult.data
      if (card.createdBy !== userId) {
        res.status(403).json({
          success: false,
          error: 'Apenas o criador do card pode remover compartilhamentos'
        })
        return
      }

      // Buscar shared_with_user_ids atual
      const { data: currentCard } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('shared_with_user_ids')
          .eq('id', cardId)
          .single()
      )

      // Obter array atual
      let currentSharedIds: string[] = []
      if (currentCard?.shared_with_user_ids) {
        if (Array.isArray(currentCard.shared_with_user_ids)) {
          currentSharedIds = currentCard.shared_with_user_ids
        } else if (typeof currentCard.shared_with_user_ids === 'string') {
          try {
            currentSharedIds = JSON.parse(currentCard.shared_with_user_ids)
          } catch {
            currentSharedIds = []
          }
        }
      }

      // Remover userId do array
      const updatedSharedIds = currentSharedIds.filter((id: string) => id !== userIdToRemove)

      // Atualizar no banco
      const { data: updated, error: updateError } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .update({
            shared_with_user_ids: updatedSharedIds,
            updated_at: new Date().toISOString()
          })
          .eq('id', cardId)
          .select()
          .single()
      )

      if (updateError) {
        throw updateError
      }

      res.status(200).json({
        success: true,
        data: {
          cardId,
          sharedWithUserIds: updatedSharedIds
        },
        message: 'Compartilhamento removido com sucesso'
      })
    } catch (error: any) {
      console.error('Erro no controller unshareWithUser:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // GET SHARED WITH - GET /api/card-features/:id/share
  // ================================================
  
  static async getSharedWith(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id: cardId } = req.params
      const userId = req.user.id

      if (!cardId) {
        res.status(400).json({
          success: false,
          error: 'ID do card é obrigatório'
        })
        return
      }

      // Verificar se o card existe e se o usuário é o dono
      const cardResult = await CardFeatureModel.findById(cardId, userId)
      if (!cardResult.success || !cardResult.data) {
        res.status(404).json({
          success: false,
          error: 'Card não encontrado'
        })
        return
      }

      const card = cardResult.data
      if (card.createdBy !== userId) {
        res.status(403).json({
          success: false,
          error: 'Apenas o criador do card pode ver a lista de compartilhamentos'
        })
        return
      }

      // Buscar shared_with_user_ids
      const { data: currentCard } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('shared_with_user_ids')
          .eq('id', cardId)
          .single()
      )

      // Obter array atual
      let sharedUserIds: string[] = []
      if (currentCard?.shared_with_user_ids) {
        if (Array.isArray(currentCard.shared_with_user_ids)) {
          sharedUserIds = currentCard.shared_with_user_ids
        } else if (typeof currentCard.shared_with_user_ids === 'string') {
          try {
            sharedUserIds = JSON.parse(currentCard.shared_with_user_ids)
          } catch {
            sharedUserIds = []
          }
        }
      }

      // Buscar dados dos usuários
      let users: any[] = []
      if (sharedUserIds.length > 0) {
        const { data: usersData } = await executeQuery(
          supabaseAdmin
            .from('users')
            .select('id, name, email')
            .in('id', sharedUserIds)
        )
        users = usersData || []
      }

      res.status(200).json({
        success: true,
        data: {
          cardId,
          sharedWith: users,
          count: users.length
        }
      })
    } catch (error: any) {
      console.error('Erro no controller getSharedWith:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor'
      })
    }
  }
}
