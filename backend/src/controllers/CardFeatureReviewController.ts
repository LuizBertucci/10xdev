import { Request, Response } from 'express'
import { CardFeatureReviewModel } from '@/models/CardFeatureReviewModel'
import type { CreateReviewRequest } from '@/types/cardfeature'

export class CardFeatureReviewController {
  
  // ================================================
  // CREATE / UPDATE - POST /api/card-features/:cardId/reviews
  // ================================================
  
  static async createOrUpdate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { cardId } = req.params
      const data: CreateReviewRequest = req.body
      const userId = req.user.id

      if (!cardId) {
        res.status(400).json({
          success: false,
          error: 'ID do card é obrigatório'
        })
        return
      }

      if (!data.rating || typeof data.rating !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Rating é obrigatório e deve ser um número entre 1 e 5'
        })
        return
      }

      const result = await CardFeatureReviewModel.createOrUpdate(cardId, userId, data.rating)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(result.statusCode === 201 ? 201 : 200).json({
        success: true,
        data: result.data,
        message: result.statusCode === 201 ? 'Review criado com sucesso' : 'Review atualizado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller createOrUpdate:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // DELETE - DELETE /api/card-features/:cardId/reviews
  // ================================================
  
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { cardId } = req.params
      const userId = req.user.id

      if (!cardId) {
        res.status(400).json({
          success: false,
          error: 'ID do card é obrigatório'
        })
        return
      }

      const result = await CardFeatureReviewModel.delete(cardId, userId)

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
        message: 'Review removido com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller delete:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // READ - GET /api/card-features/:cardId/reviews
  // ================================================
  
  static async getByCardFeature(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params

      if (!cardId) {
        res.status(400).json({
          success: false,
          error: 'ID do card é obrigatório'
        })
        return
      }

      const result = await CardFeatureReviewModel.getByCardFeature(cardId)

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
      console.error('Erro no controller getByCardFeature:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // STATS - GET /api/card-features/:cardId/reviews/stats
  // ================================================
  
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params
      const userId = req.user?.id // Opcional

      if (!cardId) {
        res.status(400).json({
          success: false,
          error: 'ID do card é obrigatório'
        })
        return
      }

      const result = await CardFeatureReviewModel.getStats(cardId, userId)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data
      })
    } catch (error) {
      console.error('Erro no controller getStats:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }
}
