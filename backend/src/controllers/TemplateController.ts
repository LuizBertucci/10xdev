import { Request, Response } from 'express'
import { TemplateModel } from '@/models/TemplateModel'
import type { CreateTemplateRequest, UpdateTemplateRequest, TemplateQueryParams } from '@/types/template'

export class TemplateController {
  // ================================================
  // CREATE - POST /api/templates (admin only)
  // ================================================
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateTemplateRequest = req.body

      if (!data?.name?.trim()) {
        res.status(400).json({ success: false, error: 'name é obrigatório' })
        return
      }
      if (!data?.zipPath?.trim()) {
        res.status(400).json({ success: false, error: 'zipPath é obrigatório' })
        return
      }

      const payload: CreateTemplateRequest = {
        ...data,
        ...(req.user?.id ? { createdBy: req.user.id } : {})
      }

      const result = await TemplateModel.create(payload)

      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: 'Template criado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller create template:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  // ================================================
  // UPDATE - PUT /api/templates/:id (admin only)
  // ================================================
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const data: UpdateTemplateRequest = req.body

      if (!id) {
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }

      if (data.name !== undefined && !data.name.trim()) {
        res.status(400).json({ success: false, error: 'name não pode ser vazio' })
        return
      }

      const result = await TemplateModel.update(id, data)

      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: 'Template atualizado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller update template:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  // ================================================
  // READ - GET /api/templates (public)
  // ================================================
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const params: TemplateQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        search: req.query.search as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        sortBy: req.query.sortBy as 'name',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      }

      const result = await TemplateModel.list(params)

      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        count: result.count
      })
    } catch (error) {
      console.error('Erro no controller list templates:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  // ================================================
  // READ - GET /api/templates/:id (public)
  // ================================================
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      if (!id) {
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }

      const result = await TemplateModel.getById(id)

      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data
      })
    } catch (error) {
      console.error('Erro no controller get template:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }
}
