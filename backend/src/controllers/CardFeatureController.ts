import { Request, Response } from 'express'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import type {
  CreateCardFeatureRequest,
  UpdateCardFeatureRequest,
  CardFeatureQueryParams,
  ContentType
} from '@/types/cardfeature'

export class CardFeatureController {
  
  // ================================================
  // CREATE - POST /api/card-features
  // ================================================
  
  static async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const data: CreateCardFeatureRequest = req.body
      const userId = req.user.id

      const result = await CardFeatureModel.create(data, userId, req.user.role || 'user')

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
        message: 'CardFeature criado com sucesso'
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
  // READ - GET /api/card-features
  // ================================================
  
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
      const userId = req.user?.id // Opcional: permite acesso público
      const userRole = req.user?.role // Admin vê todos os cards

      const params: CardFeatureQueryParams = {
        page,
        limit,
        tech: req.query.tech as string,
        language: req.query.language as string,
        content_type: req.query.content_type as string,
        card_type: req.query.card_type as string,
        search: req.query.search as string,
        visibility: req.query.visibility as string,
        approval_status: req.query.approval_status as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      }

      const result = await CardFeatureModel.findAll(params, userId, userRole)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      // Calcular informações de paginação
      const totalPages = params.limit ? Math.ceil((result.count || 0) / params.limit) : 1
      const currentPage = params.page || 1

      res.status(200).json({
        success: true,
        data: result.data,
        count: result.count,
        totalPages,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      })
    } catch (error) {
      console.error('Erro no controller getAll:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // READ - GET /api/card-features/:id
  // ================================================
  
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user?.id // Opcional: permite acesso público
      const userRole = req.user?.role // Admin vê todos os cards

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await CardFeatureModel.findById(id, userId, userRole)

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
  // READ - GET /api/card-features/search
  // ================================================
  
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const searchTerm = req.query.q as string
      const userId = req.user?.id // Opcional: permite acesso público
      const userRole = req.user?.role // Admin vê todos os cards

      if (!searchTerm) {
        res.status(400).json({
          success: false,
          error: 'Parâmetro de busca "q" é obrigatório'
        })
        return
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

      const params: CardFeatureQueryParams = {
        page,
        limit,
        tech: req.query.tech as string,
        language: req.query.language as string,
        content_type: req.query.content_type as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      }

      const result = await CardFeatureModel.search(searchTerm, params, userId, userRole)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      const totalPages = params.limit ? Math.ceil((result.count || 0) / params.limit) : 1
      const currentPage = params.page || 1

      res.status(200).json({
        success: true,
        data: result.data,
        count: result.count,
        searchTerm,
        totalPages,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      })
    } catch (error) {
      console.error('Erro no controller search:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // READ - GET /api/card-features/tech/:tech
  // ================================================
  
  static async getByTech(req: Request, res: Response): Promise<void> {
    try {
      const { tech } = req.params
      const userId = req.user?.id // Opcional: permite acesso público
      const userRole = req.user?.role // Admin vê todos os cards

      if (!tech) {
        res.status(400).json({
          success: false,
          error: 'Tecnologia é obrigatória'
        })
        return
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

      const params: CardFeatureQueryParams = {
        page,
        limit,
        language: req.query.language as string,
        content_type: req.query.content_type as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      }

      const result = await CardFeatureModel.findByTech(tech, params, userId, userRole)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      const totalPages = params.limit ? Math.ceil((result.count || 0) / params.limit) : 1
      const currentPage = params.page || 1

      res.status(200).json({
        success: true,
        data: result.data,
        count: result.count,
        tech,
        totalPages,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      })
    } catch (error) {
      console.error('Erro no controller getByTech:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // UPDATE - PUT /api/card-features/:id
  // ================================================
  
  static async update(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id } = req.params
      const data: UpdateCardFeatureRequest = req.body
      const userId = req.user.id

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await CardFeatureModel.update(id, data, userId, req.user.role || 'user')

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
        message: 'CardFeature atualizado com sucesso'
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
  // DELETE - DELETE /api/card-features/:id
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

      const { id } = req.params
      const userId = req.user.id

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await CardFeatureModel.delete(id, userId, req.user.role || 'user')

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'CardFeature removido com sucesso'
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
  // STATISTICS - GET /api/card-features/stats
  // ================================================
  
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await CardFeatureModel.getStats()

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

  // ================================================
  // BULK OPERATIONS
  // ================================================
  
  static async bulkCreate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const items: CreateCardFeatureRequest[] = req.body
      const userId = req.user.id

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Body deve ser um array com pelo menos um item'
        })
        return
      }

      const result = await CardFeatureModel.bulkCreate(items, userId)

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
        count: result.count,
        message: `${result.count} CardFeatures criados com sucesso`
      })
    } catch (error) {
      console.error('Erro no controller bulkCreate:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  static async bulkDelete(req: Request, res: Response): Promise<void> {
    try {
      const ids: string[] = req.body.ids

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Body deve conter um array "ids" com pelo menos um item'
        })
        return
      }

      const result = await CardFeatureModel.bulkDelete(ids)

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
        message: `${result.data?.deletedCount} CardFeatures removidos com sucesso`
      })
    } catch (error) {
      console.error('Erro no controller bulkDelete:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // MODERATION (ADMIN)
  // ================================================

  static async approve(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }
      if (req.user.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Acesso restrito a administradores' })
        return
      }

      const { id } = req.params
      if (!id) {
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }

      const result = await CardFeatureModel.approve(id, req.user.id)
      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({ success: true, data: result.data, message: 'Card aprovado com sucesso' })
    } catch (error) {
      console.error('Erro no controller approve:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  static async reject(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }
      if (req.user.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Acesso restrito a administradores' })
        return
      }

      const { id } = req.params
      if (!id) {
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }

      const result = await CardFeatureModel.reject(id, req.user.id)
      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({ success: true, data: result.data, message: 'Card rejeitado com sucesso' })
    } catch (error) {
      console.error('Erro no controller reject:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }
}