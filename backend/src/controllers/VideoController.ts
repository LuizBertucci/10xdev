import { Request, Response } from 'express'
import { VideoModel } from '@/models/VideoModel'
import type { CreateVideoRequest } from '@/types/video'

export class VideoController {
  
  // ================================================
  // CREATE - POST /api/videos
  // ================================================
  
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateVideoRequest = req.body

      if (!data?.title || !data?.youtubeUrl) {
        res.status(400).json({
          success: false,
          error: 'title e youtubeUrl são obrigatórios'
        })
        return
      }

      const result = await VideoModel.create(data)

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
        message: 'Vídeo criado com sucesso'
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
  // READ - GET /api/videos
  // ================================================
  
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const result = await VideoModel.list()

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
  // READ - GET /api/videos/:id
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

      const result = await VideoModel.getById(id)

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
  // UPDATE - PUT /api/videos/:id
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

      const result = await VideoModel.update(id, data)

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
        message: 'Vídeo atualizado com sucesso'
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
  // DELETE - DELETE /api/videos/:id
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

      const result = await VideoModel.delete(id)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Vídeo removido com sucesso'
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
  // UPDATE - PUT /api/videos/:id/selected-card-feature
  // ================================================
  
  static async updateSelectedCardFeature(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { cardFeatureId } = req.body
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do vídeo é obrigatório'
        })
        return
      }

      const result = await VideoModel.updateSelectedCardFeature(id, cardFeatureId || null)

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

