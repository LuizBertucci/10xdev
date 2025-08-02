import { Request, Response } from 'express'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import type {
  CreateCardFeatureRequest,
  UpdateCardFeatureRequest,
  CardFeatureQueryParams
} from '@/types/cardfeature'

export class CardFeatureController {
  
  // ================================================
  // CREATE - POST /api/card-features
  // ================================================
  
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateCardFeatureRequest = req.body

      // Validação básica
      if (!data.title || !data.tech || !data.language || !data.screens) {
        res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: title, tech, language, screens'
        })
        return
      }

      if (!Array.isArray(data.screens) || data.screens.length === 0) {
        res.status(400).json({
          success: false,
          error: 'O campo screens deve ser um array com pelo menos um item'
        })
        return
      }

      // Validar cada screen
      for (const screen of data.screens) {
        if (!screen.name || !screen.code) {
          res.status(400).json({
            success: false,
            error: 'Cada screen deve ter name e code'
          })
          return
        }
      }

      const result = await CardFeatureModel.create(data)

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
      
      const params: CardFeatureQueryParams = {
        page,
        limit,
        tech: req.query.tech as string,
        language: req.query.language as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      }

      const result = await CardFeatureModel.findAll(params)

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

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await CardFeatureModel.findById(id)

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
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      }

      const result = await CardFeatureModel.search(searchTerm, params)

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
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      }

      const result = await CardFeatureModel.findByTech(tech, params)

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
      const { id } = req.params
      const data: UpdateCardFeatureRequest = req.body

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      // Validar screens se fornecido
      if (data.screens) {
        if (!Array.isArray(data.screens) || data.screens.length === 0) {
          res.status(400).json({
            success: false,
            error: 'O campo screens deve ser um array com pelo menos um item'
          })
          return
        }

        for (const screen of data.screens) {
          if (!screen.name || !screen.code) {
            res.status(400).json({
              success: false,
              error: 'Cada screen deve ter name e code'
            })
            return
          }
        }
      }

      const result = await CardFeatureModel.update(id, data)

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
      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await CardFeatureModel.delete(id)

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
      const items: CreateCardFeatureRequest[] = req.body

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Body deve ser um array com pelo menos um item'
        })
        return
      }

      // Validar cada item
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item?.title || !item?.tech || !item?.language || !item?.description || !item?.screens) {
          res.status(400).json({
            success: false,
            error: `Item ${i + 1}: Campos obrigatórios: title, tech, language, description, screens`
          })
          return
        }

        if (!Array.isArray(item?.screens) || item?.screens.length === 0) {
          res.status(400).json({
            success: false,
            error: `Item ${i + 1}: O campo screens deve ser um array com pelo menos um item`
          })
          return
        }
      }

      const result = await CardFeatureModel.bulkCreate(items)

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
}