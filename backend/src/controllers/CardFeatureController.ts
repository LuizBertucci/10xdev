import { Request, Response } from 'express'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import { AiCardGroupingService } from '@/services/aiCardGroupingService'
import { randomUUID } from 'crypto'
import {
  CreateCardFeatureRequest,
  UpdateCardFeatureRequest,
  CardFeatureQueryParams,
  ContentType,
  CardFeatureScreen
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

  static async generateSummary(req: Request, res: Response): Promise<void> {
    console.log('=== [generateSummary] INÍCIO ===')
    console.log('[generateSummary] Card ID:', req.params.id)
    console.log('[generateSummary] User ID:', req.user?.id)
    console.log('[generateSummary] User Role:', req.user?.role)

    try {
      if (!req.user) {
        console.log('[generateSummary] ERRO: Usuário não autenticado')
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }
      const { id } = req.params
      const { force } = req.body as { force?: boolean }
      if (!id) {
        console.log('[generateSummary] ERRO: ID obrigatório')
        res.status(400).json({ success: false, error: 'ID é obrigatório' })
        return
      }
      console.log('[generateSummary] Buscando card:', id)
      const cardResult = await CardFeatureModel.findById(id, req.user.id, req.user.role)
      
      if (!cardResult.success) {
        console.log('[generateSummary] ERRO findById:', cardResult.error)
        res.status(cardResult.statusCode || 400).json({ success: false, error: cardResult.error })
        return
      }
      if (!cardResult.data) {
        console.log('[generateSummary] ERRO: Card não encontrado')
        res.status(404).json({ success: false, error: 'Card não encontrado' })
        return
      }
      const card = cardResult.data
      console.log('[generateSummary] Card encontrado:', card.title)
      console.log('[generateSummary] Card createdBy:', card.createdBy)
      console.log('[generateSummary] Is Owner:', card.createdBy === req.user.id)
      console.log('[generateSummary] Is Admin:', req.user.role === 'admin')
      const isOwner = card.createdBy === req.user.id
      const isAdmin = req.user.role === 'admin'
      console.log('[generateSummary] Permissão:', isOwner || isAdmin ? 'OK' : 'BLOQUEADO')
      
      if (!isOwner && !isAdmin) {
        const sharedResult = await CardFeatureModel.getSharedUsers(id, req.user!.id)
        const isShared = sharedResult.data?.some((u: any) => u.id === req.user!.id) || false
        console.log('[generateSummary] Is Shared:', isShared)
        
        if (!isShared) {
          console.log('[generateSummary] ERRO: Sem permissão (não é dono, admin nem compartilhado)')
          res.status(403).json({ success: false, error: 'Sem permissão para editar este card' })
          return
        }
      }
      
      console.log('[generateSummary] Verificando resumo existente...')
      const existingSummaryScreen = card.screens.find(
        s => s.name.toLowerCase() === 'resumo' || s.name.toLowerCase() === 'overview'
      )
      
      if (existingSummaryScreen && !force) {
        console.log('[generateSummary] Resumo já existe, retornando existente')
        res.status(200).json({
          success: true,
          summary: existingSummaryScreen.blocks[0]?.content || '',
          message: 'Resumo já existente'
        })
        return
      }
      
      console.log('[generateSummary] Preparando parâmetros para IA...')
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
      
      console.log('[generateSummary] Chamando IA para gerar resumo...')
      const { summary } = await AiCardGroupingService.generateCardSummary(params)
      console.log('[generateSummary] Resumo gerado com sucesso:', summary?.substring(0, 100) + '...')
      
      const summaryScreen: CardFeatureScreen = {
        name: 'Resumo',
        description: 'Resumo gerado por IA sobre esta feature',
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
      
      console.log('[generateSummary] Salvando resumo no banco...')
      const updateResult = await CardFeatureModel.update(id, { screens: updatedScreens }, req.user.id, req.user.role)
      if (!updateResult.success) {
        console.log('[generateSummary] ERRO ao salvar:', updateResult.error)
        res.status(updateResult.statusCode || 400).json({ success: false, error: updateResult.error })
        return
      }
      
      console.log('[generateSummary] SUCESSO!')
      res.status(200).json({ success: true, summary, message: 'Resumo gerado com sucesso' })
      console.log('=== [generateSummary] FIM ===')
    } catch (error) {
      console.error('[generateSummary] ERRO INTERNO:', error)
      res.status(500).json({ success: false, error: 'Erro ao gerar resumo' })
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
        _isShared = sharedResult.data?.some((u: any) => u.id === req.user!.id) || false
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