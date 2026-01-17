import { Request, Response } from 'express'
import { ContentModel } from '@/models/ContentModel'
import type { CreateContentRequest, ContentQueryParams } from '@/types/content'

export class ContentController {
  
  // ================================================
  // CREATE - POST /api/contents (admin only)
  // ================================================
  
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateContentRequest = req.body

      if (!data?.title) {
        res.status(400).json({
          success: false,
          error: 'title é obrigatório'
        })
        return
      }

      const result = await ContentModel.create(data)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: 'Conteúdo criado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller create:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // READ - GET /api/contents (public)
  // ================================================
  
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const params: ContentQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        contentType: req.query.type as any,
        category: req.query.category as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      }

      const result = await ContentModel.list(params)

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
      console.error('Erro no controller list:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // READ - GET /api/contents/:id (public)
  // ================================================
  
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await ContentModel.getById(id)

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
      console.error('Erro no controller getById:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // UPDATE - PUT /api/contents/:id (admin only)
  // ================================================
  
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const data = req.body

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await ContentModel.update(id, data)

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
        message: 'Conteúdo atualizado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller update:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // DELETE - DELETE /api/contents/:id (admin only)
  // ================================================
  
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await ContentModel.delete(id)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Conteúdo removido com sucesso'
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
  // UPDATE - PATCH /api/contents/:id/card-feature (admin only)
  // ================================================
  
  static async updateSelectedCardFeature(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { cardFeatureId } = req.body
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do conteúdo é obrigatório'
        })
        return
      }

      const result = await ContentModel.updateSelectedCardFeature(id, cardFeatureId || null)

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
        message: cardFeatureId ? 'CardFeature selecionado com sucesso' : 'CardFeature removido com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller updateSelectedCardFeature:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }
}
