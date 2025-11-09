import { Request, Response } from 'express'
import { ProjectModel } from '@/models/ProjectModel'
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectQueryParams,
  AddProjectMemberRequest,
  UpdateProjectMemberRequest,
  ProjectMemberRole
} from '@/types/project'

export class ProjectController {
  
  // ================================================
  // CREATE - POST /api/projects
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

      const data: CreateProjectRequest = req.body

      if (!data.name) {
        res.status(400).json({
          success: false,
          error: 'Nome do projeto é obrigatório'
        })
        return
      }

      const result = await ProjectModel.create(data, req.user.id)

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
        message: 'Projeto criado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller create:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
      res.status(500).json({
        success: false,
        error: errorMessage
      })
    }
  }

  // ================================================
  // READ - GET /api/projects
  // ================================================
  
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
      
      const params: ProjectQueryParams = {
        page,
        limit,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      }

      const result = await ProjectModel.findAll(params, req.user.id)

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
  // READ - GET /api/projects/:id
  // ================================================
  
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await ProjectModel.findById(id, req.user.id)

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
  // UPDATE - PUT /api/projects/:id
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
      const data: UpdateProjectRequest = req.body

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await ProjectModel.update(id, data, req.user.id)

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
        message: 'Projeto atualizado com sucesso'
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
  // DELETE - DELETE /api/projects/:id
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

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await ProjectModel.delete(id, req.user.id)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Projeto removido com sucesso'
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
  // MEMBERS - GET /api/projects/:id/members
  // ================================================
  
  static async getMembers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do projeto é obrigatório'
        })
        return
      }

      // Verificar se usuário é membro do projeto
      const project = await ProjectModel.findById(id, req.user.id)
      if (!project.success) {
        res.status(project.statusCode || 404).json({
          success: false,
          error: project.error || 'Projeto não encontrado'
        })
        return
      }

      const result = await ProjectModel.getMembers(id)

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
      console.error('Erro no controller getMembers:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // MEMBERS - POST /api/projects/:id/members
  // ================================================
  
  static async addMember(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id } = req.params
      const data: AddProjectMemberRequest = req.body

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do projeto é obrigatório'
        })
        return
      }

      if (!data.userId) {
        res.status(400).json({
          success: false,
          error: 'ID do usuário é obrigatório'
        })
        return
      }

      const result = await ProjectModel.addMember(id, data, req.user.id)

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
        message: 'Membro adicionado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller addMember:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // MEMBERS - PUT /api/projects/:id/members/:userId
  // ================================================
  
  static async updateMember(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id, userId } = req.params
      const data: UpdateProjectMemberRequest = req.body

      if (!id || !userId) {
        res.status(400).json({
          success: false,
          error: 'ID do projeto e do usuário são obrigatórios'
        })
        return
      }

      if (!data.role) {
        res.status(400).json({
          success: false,
          error: 'Role é obrigatório'
        })
        return
      }

      const result = await ProjectModel.updateMember(id, userId, data.role, req.user.id)

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
        message: 'Membro atualizado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller updateMember:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // MEMBERS - DELETE /api/projects/:id/members/:userId
  // ================================================
  
  static async removeMember(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id, userId } = req.params

      if (!id || !userId) {
        res.status(400).json({
          success: false,
          error: 'ID do projeto e do usuário são obrigatórios'
        })
        return
      }

      const result = await ProjectModel.removeMember(id, userId, req.user.id)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Membro removido com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller removeMember:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // CARDS - GET /api/projects/:id/cards
  // ================================================
  
  static async getCards(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do projeto é obrigatório'
        })
        return
      }

      // Verificar se usuário é membro do projeto
      const project = await ProjectModel.findById(id, req.user.id)
      if (!project.success) {
        res.status(project.statusCode || 404).json({
          success: false,
          error: project.error || 'Projeto não encontrado'
        })
        return
      }

      const result = await ProjectModel.getCards(id)

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
      console.error('Erro no controller getCards:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // CARDS - POST /api/projects/:id/cards
  // ================================================
  
  static async addCard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id } = req.params
      const { cardFeatureId } = req.body

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do projeto é obrigatório'
        })
        return
      }

      if (!cardFeatureId) {
        res.status(400).json({
          success: false,
          error: 'ID do card é obrigatório'
        })
        return
      }

      const result = await ProjectModel.addCard(id, cardFeatureId, req.user.id)

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
        message: 'Card adicionado ao projeto com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller addCard:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // CARDS - DELETE /api/projects/:id/cards/:cardFeatureId
  // ================================================
  
  static async removeCard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id, cardFeatureId } = req.params

      if (!id || !cardFeatureId) {
        res.status(400).json({
          success: false,
          error: 'ID do projeto e do card são obrigatórios'
        })
        return
      }

      const result = await ProjectModel.removeCard(id, cardFeatureId, req.user.id)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Card removido do projeto com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller removeCard:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // CARDS - PATCH /api/projects/:id/cards/:cardFeatureId/reorder
  // ================================================
  
  static async reorderCard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id, cardFeatureId } = req.params
      const { direction } = req.body

      if (!id || !cardFeatureId) {
        res.status(400).json({
          success: false,
          error: 'ID do projeto e do card são obrigatórios'
        })
        return
      }

      if (!direction || (direction !== 'up' && direction !== 'down')) {
        res.status(400).json({
          success: false,
          error: 'Direção deve ser "up" ou "down"'
        })
        return
      }

      const result = await ProjectModel.reorderCard(id, cardFeatureId, direction, req.user.id)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Card reordenado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller reorderCard:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }
}

