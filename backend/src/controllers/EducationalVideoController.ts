import { Request, Response } from 'express'
import { EducationalVideoModel } from '@/models/EducationalVideoModel'
import type { CreateEducationalVideoRequest } from '@/types/educational'

export class EducationalVideoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const result = await EducationalVideoModel.list()
      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }
      res.status(200).json({ success: true, data: result.data, count: result.count })
    } catch (error) {
      console.error('Erro no controller list:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      if (!id) {
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }
      const result = await EducationalVideoModel.getById(id)
      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      console.error('Erro no controller getById:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const body: CreateEducationalVideoRequest = req.body
      if (!body?.title || !body?.youtubeUrl) {
        res.status(400).json({ success: false, error: 'title e youtubeUrl são obrigatórios' })
        return
      }
      const result = await EducationalVideoModel.create(body)
      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }
      res.status(201).json({ success: true, data: result.data, message: 'Vídeo educacional criado com sucesso' })
    } catch (error) {
      console.error('Erro no controller create:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      if (!id) {
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }
      const result = await EducationalVideoModel.delete(id)
      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }
      res.status(200).json({ success: true, message: 'Vídeo educacional removido com sucesso' })
    } catch (error) {
      console.error('Erro no controller delete:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  static async updateSelectedCardFeature(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { cardFeatureId } = req.body
      
      if (!id) {
        res.status(400).json({ success: false, error: 'ID do vídeo é obrigatório' })
        return
      }

      const result = await EducationalVideoModel.updateSelectedCardFeature(id, cardFeatureId || null)
      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }
      
      res.status(200).json({
        success: true,
        data: result.data,
        message: cardFeatureId ? 'CardFeature selecionado com sucesso' : 'CardFeature removido com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller updateSelectedCardFeature:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }
}


