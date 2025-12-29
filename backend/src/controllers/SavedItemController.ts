import { Request, Response } from 'express'
import { SavedItemModel } from '@/models/SavedItemModel'
import type { ItemType } from '@/types/saveditem'

export class SavedItemController {
  // ================================================
  // SAVE - POST /api/saved-items
  // ================================================

  static async save(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { itemType, itemId } = req.body

      if (!itemType || !itemId) {
        res.status(400).json({
          success: false,
          error: 'itemType e itemId são obrigatórios'
        })
        return
      }

      if (itemType !== 'video' && itemType !== 'card') {
        res.status(400).json({
          success: false,
          error: 'itemType deve ser "video" ou "card"'
        })
        return
      }

      const result = await SavedItemModel.save(req.user.id, itemType as ItemType, itemId)

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error
      })
    } catch (error: any) {
      console.error('Erro no SavedItemController.save:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // UNSAVE - DELETE /api/saved-items/:itemType/:itemId
  // ================================================

  static async unsave(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { itemType, itemId } = req.params

      if (!itemType || !itemId) {
        res.status(400).json({
          success: false,
          error: 'itemType e itemId são obrigatórios'
        })
        return
      }

      if (itemType !== 'video' && itemType !== 'card') {
        res.status(400).json({
          success: false,
          error: 'itemType deve ser "video" ou "card"'
        })
        return
      }

      const result = await SavedItemModel.unsave(req.user.id, itemType as ItemType, itemId)

      res.status(result.statusCode || 200).json({
        success: result.success,
        error: result.error
      })
    } catch (error: any) {
      console.error('Erro no SavedItemController.unsave:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // LIST - GET /api/saved-items?type=video|card
  // ================================================

  static async list(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const itemType = req.query.type as ItemType | undefined

      if (itemType && itemType !== 'video' && itemType !== 'card') {
        res.status(400).json({
          success: false,
          error: 'type deve ser "video" ou "card"'
        })
        return
      }

      const result = await SavedItemModel.findByUser(req.user.id, itemType)

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        count: result.count,
        error: result.error
      })
    } catch (error: any) {
      console.error('Erro no SavedItemController.list:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // CHECK - GET /api/saved-items/check/:itemType/:itemId
  // ================================================

  static async check(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { itemType, itemId } = req.params

      if (!itemType || !itemId) {
        res.status(400).json({
          success: false,
          error: 'itemType e itemId são obrigatórios'
        })
        return
      }

      if (itemType !== 'video' && itemType !== 'card') {
        res.status(400).json({
          success: false,
          error: 'itemType deve ser "video" ou "card"'
        })
        return
      }

      const result = await SavedItemModel.isSaved(req.user.id, itemType as ItemType, itemId)

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: { isSaved: result.data },
        error: result.error
      })
    } catch (error: any) {
      console.error('Erro no SavedItemController.check:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // CHECK MULTIPLE - POST /api/saved-items/check-multiple
  // ================================================

  static async checkMultiple(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { itemType, itemIds } = req.body

      if (!itemType || !itemIds || !Array.isArray(itemIds)) {
        res.status(400).json({
          success: false,
          error: 'itemType e itemIds (array) são obrigatórios'
        })
        return
      }

      if (itemType !== 'video' && itemType !== 'card') {
        res.status(400).json({
          success: false,
          error: 'itemType deve ser "video" ou "card"'
        })
        return
      }

      const result = await SavedItemModel.checkMultiple(req.user.id, itemType as ItemType, itemIds)

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error
      })
    } catch (error: any) {
      console.error('Erro no SavedItemController.checkMultiple:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }
}

