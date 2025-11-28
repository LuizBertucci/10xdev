import { Request, Response } from 'express'
import { ProjectModel } from '@/models/ProjectModel'
import { GithubService } from '@/services/githubService'
import {
  ProjectMemberRole,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type ProjectQueryParams,
  type AddProjectMemberRequest,
  type UpdateProjectMemberRequest,
  type GetGithubInfoRequest
} from '@/types/project'

const ALLOWED_MEMBER_ROLES = Object.values(ProjectMemberRole) as ProjectMemberRole[]

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
      const userId = req.user.id

      if (!data.name) {
        res.status(400).json({
          success: false,
          error: 'Nome do projeto é obrigatório'
        })
        return
      }

      const result = await ProjectModel.create(data, userId)

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
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // READ - GET /api/projects
  // ================================================
  
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id

      const pageParam = req.query.page
      const limitParam = req.query.limit
      const sortByParam = req.query.sortBy
      const sortOrderParam = req.query.sortOrder

      const page = pageParam ? Number(pageParam) : 1
      const limit = limitParam ? Number(limitParam) : 10

      if (!Number.isInteger(page) || page <= 0) {
        res.status(400).json({
          success: false,
          error: 'Parâmetro "page" deve ser um número inteiro maior que zero'
        })
        return
      }

      if (!Number.isInteger(limit) || limit <= 0) {
        res.status(400).json({
          success: false,
          error: 'Parâmetro "limit" deve ser um número inteiro maior que zero'
        })
        return
      }

      const allowedSortBy: NonNullable<ProjectQueryParams['sortBy']>[] = ['name', 'created_at', 'updated_at']
      let sortBy: ProjectQueryParams['sortBy']

      if (typeof sortByParam === 'string') {
        if (!allowedSortBy.includes(sortByParam as NonNullable<ProjectQueryParams['sortBy']>)) {
          res.status(400).json({
            success: false,
            error: 'Parâmetro "sortBy" inválido'
          })
          return
        }
        sortBy = sortByParam as ProjectQueryParams['sortBy']
      }

      let sortOrder: ProjectQueryParams['sortOrder']
      if (typeof sortOrderParam === 'string') {
        const normalizedSortOrder = sortOrderParam.toLowerCase()
        if (normalizedSortOrder !== 'asc' && normalizedSortOrder !== 'desc') {
          res.status(400).json({
            success: false,
            error: 'Parâmetro "sortOrder" deve ser "asc" ou "desc"'
          })
          return
        }
        sortOrder = normalizedSortOrder as ProjectQueryParams['sortOrder']
      }

      const params: ProjectQueryParams = {
        page,
        limit,
        ...(typeof req.query.search === 'string' ? { search: req.query.search } : {}),
        ...(sortBy ? { sortBy } : {}),
        ...(sortOrder ? { sortOrder } : {})
      }

      const result = await ProjectModel.findAll(params, userId)

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
      const userId = req.user.id

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await ProjectModel.findById(id, userId)

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
      const userId = req.user.id

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await ProjectModel.update(id, data, userId)

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

      const result = await ProjectModel.delete(id, userId)

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
      const project = await ProjectModel.findById(id, req.user!.id)
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

      const requesterId = req.user!.id
      const roleToAssign = data.role ?? ProjectMemberRole.MEMBER

      if (data.role && !ALLOWED_MEMBER_ROLES.includes(data.role)) {
        res.status(400).json({
          success: false,
          error: 'Role inválido'
        })
        return
      }

      const memberPayload: AddProjectMemberRequest = {
        userId: data.userId,
        role: roleToAssign
      }

      const result = await ProjectModel.addMember(id, memberPayload, requesterId)

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
      const requesterId = req.user!.id

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

      if (!ALLOWED_MEMBER_ROLES.includes(data.role)) {
        res.status(400).json({
          success: false,
          error: 'Role inválido'
        })
        return
      }

      const result = await ProjectModel.updateMember(id, userId, data.role, requesterId)

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

      const result = await ProjectModel.removeMember(id, userId, req.user!.id)

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

