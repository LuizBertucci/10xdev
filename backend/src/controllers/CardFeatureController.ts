import { Request, Response } from 'express'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import { AiCardGroupingService } from '@/services/aiCardGroupingService'
import { randomUUID } from 'crypto'
import {
  CreateCardFeatureRequest,
  UpdateCardFeatureRequest,
  CardFeatureQueryParams,
  ContentType,
  CardFeatureScreen,
  SupportedLanguage,
  SupportedTech
} from '@/types/cardfeature'

const VALID_LANGUAGES = Object.values(SupportedLanguage)
const VALID_TECHS = Object.values(SupportedTech)

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

      if (data.language && !VALID_LANGUAGES.includes(data.language as SupportedLanguage)) {
        res.status(400).json({
          success: false,
          error: `Linguagem inválida: "${data.language}". Valores válidos: ${VALID_LANGUAGES.join(', ')}`
        })
        return
      }

      if (data.tech && !VALID_TECHS.includes(data.tech as SupportedTech)) {
        res.status(400).json({
          success: false,
          error: `Tech inválida: "${data.tech}". Valores válidos: ${VALID_TECHS.join(', ')}`
        })
        return
      }

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

      const VALID_OWNERSHIP_VALUES = ['all', 'created_by_me', 'shared_with_me']
      const ownership = req.query.ownership as string | undefined
      if (ownership !== undefined && !VALID_OWNERSHIP_VALUES.includes(ownership)) {
        res.status(400).json({
          success: false,
          error: 'Parâmetro ownership inválido. Valores válidos: all, created_by_me, shared_with_me'
        })
        return
      }

      const params: CardFeatureQueryParams = {
        page,
        limit,
        ...(req.query.tech && { tech: req.query.tech as string }),
        ...(req.query.language && { language: req.query.language as string }),
        ...(req.query.content_type && { content_type: req.query.content_type as string }),
        ...(req.query.card_type && { card_type: req.query.card_type as string }),
        ...(req.query.search && { search: req.query.search as string }),
        ...(req.query.visibility && { visibility: req.query.visibility as string }),
        ...(req.query.approval_status && { approval_status: req.query.approval_status as string }),
        ...(ownership && { ownership }),
        ...(req.query.created_by && { created_by: req.query.created_by as string }),
        ...(req.query.tags && { tags: req.query.tags as string }),
        sortBy: req.query.sortBy as 'tech' | 'language' | 'created_at' | 'updated_at' | 'title',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
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
        sortBy: req.query.sortBy as 'tech' | 'language' | 'created_at' | 'updated_at' | 'title',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
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
        sortBy: req.query.sortBy as 'tech' | 'language' | 'created_at' | 'updated_at' | 'title',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
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

      if (data.language && !VALID_LANGUAGES.includes(data.language as SupportedLanguage)) {
        res.status(400).json({
          success: false,
          error: `Linguagem inválida: "${data.language}". Valores válidos: ${VALID_LANGUAGES.join(', ')}`
        })
        return
      }

      if (data.tech && !VALID_TECHS.includes(data.tech as SupportedTech)) {
        res.status(400).json({
          success: false,
          error: `Tech inválida: "${data.tech}". Valores válidos: ${VALID_TECHS.join(', ')}`
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
  // FILTERS METADATA - GET /api/card-features/filters
  // ================================================

  static async getFilters(_req: Request, res: Response): Promise<void> {
    try {
      const result = await CardFeatureModel.getFilters()

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
      console.error('Erro no controller getFilters:', error)
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

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item && item.language && !VALID_LANGUAGES.includes(item.language as SupportedLanguage)) {
          res.status(400).json({
            success: false,
            error: `Item ${i + 1}: linguagem inválida "${item.language}". Valores válidos: ${VALID_LANGUAGES.join(', ')}`
          })
          return
        }
        if (item && item.tech && !VALID_TECHS.includes(item.tech as SupportedTech)) {
          res.status(400).json({
            success: false,
            error: `Item ${i + 1}: tech inválida "${item.tech}". Valores válidos: ${VALID_TECHS.join(', ')}`
          })
          return
        }
      }

      const result = await CardFeatureModel.bulkCreate(items, userId, req.user.role || 'user')

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
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const ids: string[] = req.body.ids

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Body deve conter um array "ids" com pelo menos um item'
        })
        return
      }

      const userId = req.user.id
      const isAdmin = req.user.role === 'admin'

      // Admin pode deletar qualquer card
      if (isAdmin) {
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
        return
      }

      // Usuário normal: filtrar apenas cards próprios
      const result = await CardFeatureModel.bulkDeleteByUser(ids, userId)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      // Avisar se tentou deletar cards de outros
      const deletedCount = result.data?.deletedCount || 0
      const rejectedCount = ids.length - deletedCount

      if (rejectedCount > 0) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: `${deletedCount} CardFeatures removidos com sucesso. ${rejectedCount} cards foram ignorados (não pertencem a você)`
        })
      } else {
        res.status(200).json({
          success: true,
          data: result.data,
          message: `${deletedCount} CardFeatures removidos com sucesso`
        })
      }
    } catch (error) {
      console.error('Erro no controller bulkDelete:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  static async bulkUpdate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }

      const updates = req.body

      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({ success: false, error: 'Body deve ser um array com pelo menos um item' })
        return
      }

      if (updates.some((item) => item === null || typeof item !== 'object' || !item.id || typeof item.id !== 'string')) {
        res.status(400).json({ success: false, error: 'Cada item deve ter um campo "id" válido' })
        return
      }

      for (let i = 0; i < updates.length; i++) {
        const item = updates[i]
        if (item && item.language && !VALID_LANGUAGES.includes(item.language as SupportedLanguage)) {
          res.status(400).json({
            success: false,
            error: `Item ${i + 1}: linguagem inválida "${item.language}". Valores válidos: ${VALID_LANGUAGES.join(', ')}`
          })
          return
        }
        if (item && item.tech && !VALID_TECHS.includes(item.tech as SupportedTech)) {
          res.status(400).json({
            success: false,
            error: `Item ${i + 1}: tech inválida "${item.tech}". Valores válidos: ${VALID_TECHS.join(', ')}`
          })
          return
        }
      }

      const result = await CardFeatureModel.bulkUpdate(updates)

      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: `${result.data?.updatedCount} CardFeatures atualizados com sucesso`
      })
    } catch (error) {
      console.error('Erro no controller bulkUpdate:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
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

  // ================================================
  // SHARING (compartilhamento de cards privados)
  // ================================================

  /**
   * Compartilha um card privado com usuários
   * POST /api/card-features/:id/share
   */
  static async shareCard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }

      const { id } = req.params
      const { userIds } = req.body

      if (!id) {
        res.status(400).json({ success: false, error: 'ID do card é obrigatório' })
        return
      }

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ success: false, error: 'userIds deve ser um array com pelo menos um ID' })
        return
      }

      const result = await CardFeatureModel.shareWithUsers(id, userIds, req.user.id)

      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: `Card compartilhado com ${result.data?.sharedWith ?? userIds.length} usuário(s)`
      })
    } catch (error) {
      console.error('Erro no controller shareCard:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  /**
   * Remove compartilhamento de um card com um usuário
   * DELETE /api/card-features/:id/share/:userId
   */
  static async unshareCard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }

      const { id, userId } = req.params

      if (!id || !userId) {
        res.status(400).json({ success: false, error: 'ID do card e ID do usuário são obrigatórios' })
        return
      }

      const result = await CardFeatureModel.unshareWithUser(id, userId, req.user.id)

      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Compartilhamento removido com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller unshareCard:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  /**
   * Lista usuários com quem o card está compartilhado
   * GET /api/card-features/:id/shares
   */
  static async getCardShares(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }

      const { id } = req.params

      if (!id) {
        res.status(400).json({ success: false, error: 'ID do card é obrigatório' })
        return
      }

      const result = await CardFeatureModel.getSharedUsers(id, req.user.id)

      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data
      })
    } catch (error) {
      console.error('Erro no controller getCardShares:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  static async generateVisaoGeral(req: Request, res: Response): Promise<void> {
    console.log('=== [generateVisaoGeral] INÍCIO ===')
    console.log('[generateVisaoGeral] Card ID:', req.params.id)
    console.log('[generateVisaoGeral] User ID:', req.user?.id)
    console.log('[generateVisaoGeral] User Role:', req.user?.role)

    try {
      if (!req.user) {
        console.log('[generateVisaoGeral] ERRO: Usuário não autenticado')
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }
      const { id } = req.params
      const { force, prompt } = req.body as { force?: boolean; prompt?: string }
      if (!id) {
        console.log('[generateVisaoGeral] ERRO: ID obrigatório')
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }
      console.log('[generateVisaoGeral] Buscando card:', id)
      const cardResult = await CardFeatureModel.findById(id, req.user.id, req.user.role)

      if (!cardResult.success) {
        console.log('[generateVisaoGeral] ERRO findById:', cardResult.error)
        res.status(cardResult.statusCode || 400).json({ success: false, error: cardResult.error })
        return
      }
      if (!cardResult.data) {
        console.log('[generateVisaoGeral] ERRO: Card não encontrado')
        res.status(404).json({ success: false, error: 'Card não encontrado' })
        return
      }
      const card = cardResult.data
      console.log('[generateVisaoGeral] Card encontrado:', card.title)
      console.log('[generateVisaoGeral] Card createdBy:', card.createdBy)
      console.log('[generateVisaoGeral] Is Owner:', card.createdBy === req.user.id)
      console.log('[generateVisaoGeral] Is Admin:', req.user.role === 'admin')
      const isOwner = card.createdBy === req.user.id
      const isAdmin = req.user.role === 'admin'
      console.log('[generateVisaoGeral] Permissão:', isOwner || isAdmin ? 'OK' : 'BLOQUEADO')

      if (!isOwner && !isAdmin) {
        const sharedResult = await CardFeatureModel.getSharedUsers(id, req.user!.id)
        const isShared = sharedResult.data?.some((u) => u.id === req.user!.id) || false
        console.log('[generateVisaoGeral] Is Shared:', isShared)

        if (!isShared) {
          console.log('[generateVisaoGeral] ERRO: Sem permissão (não é dono, admin nem compartilhado)')
          res.status(403).json({ success: false, error: 'Sem permissão para editar este card' })
          return
        }
      }

      console.log('[generateVisaoGeral] Verificando visão geral existente...')
      const existingSummaryScreen = card.screens.find(
        s => /^(visão geral|visao geral|resumo|sumário|summary|overview)$/i.test(s.name.trim())
      )

      if (existingSummaryScreen && !force) {
        console.log('[generateVisaoGeral] Visão Geral já existe, retornando existente')
        res.status(200).json({
          success: true,
          summary: existingSummaryScreen.blocks[0]?.content || '',
          message: 'Visão Geral já existente'
        })
        return
      }

      console.log('[generateVisaoGeral] Preparando parâmetros para IA...')
      const params: { cardTitle: string; screens: Array<{ name: string; description: string; blocks: Array<{ type: ContentType; content: string; language?: string; title?: string; route?: string }> }>; tech?: string; language?: string } = {
        cardTitle: card.title,
        screens: card.screens.map(s => ({
          name: s.name,
          description: s.description,
          blocks: s.blocks.map(b => {
            const block: { type: ContentType; content: string; language?: string; title?: string; route?: string } = {
              type: b.type,
              content: b.content
            }
            if (b.language) block.language = b.language
            if (b.title) block.title = b.title
            if (b.route) block.route = b.route
            return block
          })
        }))
      }
      if (card.tech) params.tech = card.tech
      if (card.language) params.language = card.language

      console.log('[generateVisaoGeral] Chamando IA para gerar visão geral...')
      const { summary } = await AiCardGroupingService.generateCardVisaoGeral(params, prompt)
      console.log('[generateVisaoGeral] Visão Geral gerada com sucesso:', summary?.substring(0, 100) + '...')

      const summaryScreen: CardFeatureScreen = {
        name: 'Visão Geral',
        description: 'Visão Geral gerada por IA sobre esta feature',
        blocks: [{
          id: randomUUID(),
          type: ContentType.TEXT,
          content: summary,
          order: 0
        }]
      }
      const updatedScreens = existingSummaryScreen
        ? card.screens.map(s => s.name.toLowerCase() === existingSummaryScreen.name.toLowerCase() ? summaryScreen : s)
        : [summaryScreen, ...card.screens]

      console.log('[generateVisaoGeral] Salvando visão geral no banco...')
      const updateResult = await CardFeatureModel.update(id, { screens: updatedScreens }, req.user.id, req.user.role)
      if (!updateResult.success) {
        console.log('[generateVisaoGeral] ERRO ao salvar:', updateResult.error)
        res.status(updateResult.statusCode || 400).json({ success: false, error: updateResult.error })
        return
      }

      console.log('[generateVisaoGeral] SUCESSO!')
      res.status(200).json({ success: true, summary, message: 'Visão Geral gerada com sucesso' })
      console.log('=== [generateVisaoGeral] FIM ===')
    } catch (error) {
      console.error('[generateVisaoGeral] ERRO INTERNO:', error)
      res.status(500).json({ success: false, error: 'Erro ao gerar visão geral' })
    }
  }

  static async checkAccess(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Não autenticado' })
        return
      }
      const { id } = req.params
      if (!id) {
        res.status(400).json({ success: false, error: 'ID obrigatório' })
        return
      }
      const cardResult = await CardFeatureModel.findById(id, req.user.id, req.user.role)
      if (!cardResult.success || !cardResult.data) {
        res.status(404).json({ success: false, error: 'Card não encontrado' })
        return
      }
      const card = cardResult.data
      const isOwner = card.createdBy === req.user.id
      const isAdmin = req.user.role === 'admin'
      let _isShared = false
      if (!isOwner && !isAdmin) {
        const sharedResult = await CardFeatureModel.getSharedUsers(id, req.user!.id)
        _isShared = sharedResult.data?.some((u) => u.id === req.user!.id) || false
      }
      res.status(200).json({
        success: true,
        data: {
          canGenerate: isAdmin,
          isOwner,
          isAdmin
        }
      })
    } catch (error) {
      console.error('Erro em checkAccess:', error)
      res.status(500).json({ success: false, error: 'Erro ao verificar acesso' })
    }
  }
}