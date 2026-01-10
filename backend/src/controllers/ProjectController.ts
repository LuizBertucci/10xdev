import { Request, Response } from 'express'
import { ProjectModel } from '@/models/ProjectModel'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import { ImportJobModel, type ImportJobStep } from '@/models/ImportJobModel'
import { GithubService } from '@/services/githubService'
import { executeQuery, supabaseAdmin } from '@/database/supabase'
import { Visibility } from '@/types/cardfeature'
import {
  ProjectMemberRole,
  type CreateProjectRequest,
  type GetGithubInfoRequest,
  type ImportFromGithubRequest,
  type UpdateProjectRequest,
  type ProjectQueryParams,
  type AddProjectMemberRequest,
  type UpdateProjectMemberRequest
} from '@/types/project'

const ALLOWED_MEMBER_ROLES = Object.values(ProjectMemberRole) as ProjectMemberRole[]

export class ProjectController {

  // ================================================
  // GITHUB - POST /api/projects/github-info
  // ================================================

  static async getGithubInfo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }

      const { url, token }: GetGithubInfoRequest = req.body
      if (!url) {
        res.status(400).json({ success: false, error: 'URL é obrigatória' })
        return
      }

      const info = await GithubService.getRepoDetails(url, token)
      res.status(200).json({ success: true, data: info })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Erro ao buscar informações do repositório' })
    }
  }

  // ================================================
  // GITHUB - POST /api/projects/import-from-github
  // ================================================

  static async importFromGithub(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' })
        return
      }

      const { url, token, name, description, useAi, addMemberEmail }: ImportFromGithubRequest = req.body
      const userId = req.user.id

      if (!url) {
        res.status(400).json({ success: false, error: 'URL do repositório é obrigatória' })
        return
      }

      // 1) Obter nome/descrição do repo (best-effort)
      let projectName = name
      let projectDescription = description
      if (!projectName) {
        const repoInfo = await GithubService.getRepoDetails(url, token)
        projectName = repoInfo.name
        projectDescription = projectDescription || repoInfo.description || undefined
      }

      // 2) Criar o projeto
      const cleanUrl = url.replace(/\.git$/i, '').split('?')[0] || undefined
      const projectData: CreateProjectRequest = {
        name: projectName || 'Projeto',
        ...(projectDescription ? { description: projectDescription } : {}),
        ...(cleanUrl ? { repositoryUrl: cleanUrl } : {})
      }

      const projectResult = await ProjectModel.create(projectData, userId)
      if (!projectResult.success || !projectResult.data) {
        res.status(500).json({ success: false, error: 'Erro ao criar projeto' })
        return
      }

      const projectId = projectResult.data.id

      // 3) Opcional: adicionar membro por email (best-effort)
      if (addMemberEmail?.trim()) {
        await this.tryAddMemberByEmail(projectId, addMemberEmail.trim(), userId)
      }

      // 4) Criar job e responder imediatamente
      const job = await ImportJobModel.create({
        project_id: projectId,
        created_by: userId,
        status: 'running',
        step: 'starting',
        progress: 0,
        message: 'Iniciando importação...',
        ai_requested: useAi === true
      })

      res.status(202).json({
        success: true,
        data: { project: projectResult.data, jobId: job.id },
        message: 'Importação iniciada.'
      })

      // 5) Background processing
      setImmediate(async () => {
        const updateJob = async (patch: {
          status?: 'running' | 'done' | 'error'
          step?: ImportJobStep
          progress?: number
          message?: string | null
          error?: string | null
          filesProcessed?: number
          cardsCreated?: number
          aiUsed?: boolean
          aiCardsCreated?: number
        }) => {
          await ImportJobModel.update(job.id, {
            ...(patch.status ? { status: patch.status } : {}),
            ...(patch.step ? { step: patch.step } : {}),
            ...(typeof patch.progress === 'number' ? { progress: patch.progress } : {}),
            ...(patch.message !== undefined ? { message: patch.message } : {}),
            ...(patch.error !== undefined ? { error: patch.error } : {}),
            ...(typeof patch.filesProcessed === 'number' ? { files_processed: patch.filesProcessed as any } : {}),
            ...(typeof patch.cardsCreated === 'number' ? { cards_created: patch.cardsCreated as any } : {}),
            ...(typeof patch.aiUsed === 'boolean' ? { ai_used: patch.aiUsed as any } : {}),
            ...(typeof patch.aiCardsCreated === 'number' ? { ai_cards_created: patch.aiCardsCreated as any } : {})
          } as any)
        }

        try {
          await updateJob({ step: 'downloading_zip', progress: 5, message: 'Baixando o repositório...' })

          let totalCardsCreated = 0
          let totalFilesProcessed = 0

          const { cards, filesProcessed, aiUsed, aiCardsCreated } = await GithubService.processRepoToCards(
            url,
            token,
            {
              useAi: useAi === true,
              onProgress: async (p) => {
                await updateJob({
                  step: p.step as ImportJobStep,
                  progress: p.progress ?? 0,
                  message: p.message ?? null,
                  cardsCreated: totalCardsCreated,
                  filesProcessed: totalFilesProcessed
                })
              },
              onCardReady: async (card) => {
                // Create card immediately after AI processes it
                const normalizedCard = {
                  ...card,
                  visibility: Visibility.UNLISTED,
                  created_in_project_id: projectId
                }
                
                const createdRes = await CardFeatureModel.bulkCreate([normalizedCard] as any, userId)
                if (!createdRes.success || !createdRes.data || createdRes.data.length === 0) {
                  throw new Error(createdRes.error || 'Erro ao criar card')
                }
                
                const cardId = createdRes.data[0]!.id
                const assoc = await ProjectModel.addCardsBulk(projectId, [cardId], userId)
                if (!assoc.success) {
                  throw new Error(assoc.error || 'Erro ao associar card ao projeto')
                }
                
                totalCardsCreated++
                // Count files from screens
                const filesInCard = card.screens?.reduce((sum, s) => {
                  // Each screen has blocks, each block is a file
                  return sum + (s.blocks?.length || 0)
                }, 0) || 0
                totalFilesProcessed += filesInCard
                
                await updateJob({
                  step: 'creating_cards',
                  progress: 70 + Math.min(25, Math.floor((totalCardsCreated / 100) * 25)), // Estimate based on typical 50-100 cards
                  message: `Criando cards... (${totalCardsCreated} criados)`,
                  cardsCreated: totalCardsCreated,
                  filesProcessed: totalFilesProcessed
                })
              }
            }
          )

          // All cards should have been created via onCardReady callback
          // This is just a safety check
          if (totalCardsCreated === 0 && cards.length === 0) {
            await updateJob({
              status: 'error',
              step: 'error',
              progress: 100,
              message: 'Nenhum arquivo de código encontrado.',
              error: 'Nenhum arquivo de código encontrado.'
            })
            return
          }

          await updateJob({ step: 'linking_cards', progress: 98, message: 'Finalizando...' })
          await updateJob({ 
            status: 'done', 
            step: 'done', 
            progress: 100, 
            message: 'Importação concluída.',
            cardsCreated: totalCardsCreated || cards.length,
            filesProcessed: totalFilesProcessed || filesProcessed,
            aiUsed,
            aiCardsCreated
          })
        } catch (e: any) {
          await ImportJobModel.update(job.id, {
            status: 'error',
            step: 'error',
            progress: 100,
            message: 'Falha ao importar.',
            error: e?.message || 'Erro desconhecido'
          })
        }
      })
    } catch (error: any) {
      let statusCode = 400
      const errorMessage = error?.message || 'Erro ao importar projeto do GitHub'

      if (errorMessage.toLowerCase().includes('rate') || errorMessage.toLowerCase().includes('limite')) statusCode = 429
      else if (errorMessage.toLowerCase().includes('timeout')) statusCode = 504
      else if (errorMessage.toLowerCase().includes('não encontrado') || errorMessage.includes('404')) statusCode = 404
      else if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('permissão')) statusCode = 401

      res.status(statusCode).json({ success: false, error: errorMessage })
    }
  }

  private static async tryAddMemberByEmail(projectId: string, email: string, requesterId: string): Promise<void> {
    const normalized = email.toLowerCase().trim()
    if (!normalized) return

    // Buscar usuário pela tabela users (perfil) - best-effort
    const { data } = await executeQuery(
      supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', normalized)
        .maybeSingle()
    )

    const userIdToAdd = (data as any)?.id as string | undefined
    if (!userIdToAdd || userIdToAdd === requesterId) return

    await ProjectModel.addMember(projectId, { userId: userIdToAdd }, requesterId)
  }
  
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
      const deleteCards = req.query.deleteCards === 'true'

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID é obrigatório'
        })
        return
      }

      const result = await ProjectModel.delete(id, userId, deleteCards)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error
        })
        return
      }

      const cardsDeleted = result.data?.cardsDeleted || 0
      const message = cardsDeleted > 0
        ? `Projeto e ${cardsDeleted} card${cardsDeleted > 1 ? 's' : ''} removidos com sucesso`
        : 'Projeto removido com sucesso'

      res.status(200).json({
        success: true,
        message,
        data: { cardsDeleted }
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

      // Extrair parâmetros de paginação
      const limitParam = req.query.limit
      const offsetParam = req.query.offset
      const limit = limitParam ? Number(limitParam) : undefined
      const offset = offsetParam ? Number(offsetParam) : undefined

      // Validar parâmetros de paginação
      if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
        res.status(400).json({
          success: false,
          error: 'Parâmetro "limit" deve ser um número inteiro maior que zero'
        })
        return
      }

      if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
        res.status(400).json({
          success: false,
          error: 'Parâmetro "offset" deve ser um número inteiro maior ou igual a zero'
        })
        return
      }

      const result = await ProjectModel.getCards(id, limit, offset)

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

