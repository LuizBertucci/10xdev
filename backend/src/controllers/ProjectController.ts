import { Request, Response } from 'express'
import { ProjectModel } from '@/models/ProjectModel'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import { GithubService } from '@/services/githubService'
import { ImportJobModel, type ImportJobStep } from '@/models/ImportJobModel'
import { supabaseAdmin, executeQuery } from '@/database/supabase'
import {
  ProjectMemberRole,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type ProjectQueryParams,
  type AddProjectMemberRequest,
  type UpdateProjectMemberRequest,
  type GetGithubInfoRequest,
  type ImportFromGithubRequest
} from '@/types/project'

const ALLOWED_MEMBER_ROLES = Object.values(ProjectMemberRole) as ProjectMemberRole[]

export class ProjectController {

  // ================================================
  // GITHUB - POST /api/projects/github-info
  // ================================================

  static async getGithubInfo(req: Request, res: Response): Promise<void> {
    try {
      console.log('[GitHub Info] Requisição recebida:', req.body)
      const { url, token }: GetGithubInfoRequest = req.body

      if (!url) {
        console.log('[GitHub Info] URL não fornecida')
        res.status(400).json({
          success: false,
          error: 'URL é obrigatória'
        })
        return
      }

      console.log('[GitHub Info] Buscando info de:', url)
      const info = await GithubService.getRepoDetails(url, token)
      console.log('[GitHub Info] Sucesso:', info.name)

      res.status(200).json({
        success: true,
        data: info
      })
    } catch (error: any) {
      console.error('[GitHub Info] ERRO:', error.message)
      res.status(400).json({
        success: false,
        error: error.message || 'Erro ao buscar informações do repositório'
      })
    }
  }

  // ================================================
  // GITHUB - POST /api/projects/import-from-github
  // ================================================

  static async importFromGithub(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { url, token, name, description, useAi, addMemberEmail }: ImportFromGithubRequest = req.body
      const userId = req.user.id

      if (!url) {
        res.status(400).json({
          success: false,
          error: 'URL do repositório é obrigatória'
        })
        return
      }

      // 1. Get repo info if name not provided
      let projectName = name
      let projectDescription = description

      if (!projectName) {
        const repoInfo = await GithubService.getRepoDetails(url, token)
        projectName = repoInfo.name
        projectDescription = projectDescription || repoInfo.description || undefined
      }

      // 2. Create the project primeiro (para navegar imediatamente)
      const cleanUrl = url.replace(/\.git$/, '').split('?')[0]
      const projectData: CreateProjectRequest = {
        name: projectName
      }
      if (projectDescription) {
        projectData.description = projectDescription
      }
      if (cleanUrl) {
        projectData.repositoryUrl = cleanUrl
      }
      const projectResult = await ProjectModel.create(projectData, userId)

      if (!projectResult.success || !projectResult.data) {
        res.status(500).json({
          success: false,
          error: 'Erro ao criar projeto'
        })
        return
      }

      const projectId = projectResult.data.id

      // 3. Opcional: adicionar membro por email
      if (addMemberEmail && addMemberEmail.trim()) {
        await this.tryAddMemberByEmail(projectId, addMemberEmail.trim(), userId)
      }

      // 4. Criar job e responder imediatamente
      const job = await ImportJobModel.create({
        project_id: projectId,
        created_by: userId,
        status: 'running',
        step: 'starting',
        progress: 0,
        message: 'Iniciando importação…',
        ai_requested: useAi === true
      })

      res.status(202).json({
        success: true,
        data: {
          project: projectResult.data,
          jobId: job.id
        },
        message: 'Importação iniciada. Abrindo o projeto…'
      })

      // 5. Processar em background e atualizar progress em tempo real
      setImmediate(async () => {
        const updateJob = async (patch: {
          step?: ImportJobStep
          progress?: number
          message?: string
          filesProcessed?: number
          cardsCreated?: number
          aiUsed?: boolean
          aiCardsCreated?: number
          status?: 'running' | 'done' | 'error'
          error?: string
        }) => {
          const update: any = {}
          if (patch.step !== undefined) update.step = patch.step
          if (patch.progress !== undefined) update.progress = patch.progress
          if (patch.message !== undefined) update.message = patch.message ?? null
          if (patch.filesProcessed !== undefined) update.files_processed = patch.filesProcessed
          if (patch.cardsCreated !== undefined) update.cards_created = patch.cardsCreated
          if (patch.aiUsed !== undefined) update.ai_used = patch.aiUsed
          if (patch.aiCardsCreated !== undefined) update.ai_cards_created = patch.aiCardsCreated
          if (patch.status !== undefined) update.status = patch.status
          if (patch.error !== undefined) update.error = patch.error ?? null

          await ImportJobModel.update(job.id, update)
        }

        try {
          await updateJob({ step: 'downloading_zip', progress: 5, message: 'Baixando o repositório do GitHub…' })

          const { cards, filesProcessed, aiUsed, aiCardsCreated } = await GithubService.processRepoToCards(
            url,
            token,
            useAi === true
              ? {
                  useAi: true,
                  onProgress: async (p) => {
                    const patch: any = { step: (p.step as ImportJobStep) || 'analyzing_repo' }
                    if (p.progress !== undefined) patch.progress = p.progress
                    if (p.message !== undefined) patch.message = p.message
                    await updateJob(patch)
                  }
                }
              : {
                  onProgress: async (p) => {
                    const patch: any = { step: (p.step as ImportJobStep) || 'analyzing_repo' }
                    if (p.progress !== undefined) patch.progress = p.progress
                    if (p.message !== undefined) patch.message = p.message
                    await updateJob(patch)
                  }
                }
          )

          if (cards.length === 0) {
            await updateJob({ status: 'error', step: 'error', progress: 100, message: 'Nenhum arquivo de código encontrado.', error: 'Nenhum arquivo de código encontrado.' })
            return
          }

          await updateJob({
            step: 'generating_cards',
            progress: 60,
            message: aiUsed ? 'Organizando funcionalidades com IA…' : 'Organizando funcionalidades…',
            filesProcessed,
            aiUsed,
            aiCardsCreated,
            cardsCreated: 0
          })

          const total = cards.length
          let created = 0
          const batchSize = 20

          await updateJob({ step: 'creating_cards', progress: 70, message: `Criando cards… (0/${total})`, cardsCreated: 0 })

          for (let i = 0; i < cards.length; i += batchSize) {
            const slice = cards.slice(i, i + batchSize)
            const resCards = await CardFeatureModel.bulkCreate(slice)
            if (!resCards.success || !resCards.data) {
              throw new Error(resCards.error || 'Erro ao criar cards')
            }

            const ids = resCards.data.map((c) => c.id)
            const assoc = await ProjectModel.addCardsBulk(projectId, ids, userId)
            if (!assoc.success) {
              throw new Error(assoc.error || 'Erro ao associar cards ao projeto')
            }

            created += ids.length

            const pct = 70 + Math.min(25, Math.floor((created / total) * 25))
            await updateJob({
              step: 'creating_cards',
              progress: pct,
              message: `Criando cards… (${created}/${total})`,
              cardsCreated: created,
              filesProcessed
            })
          }

          await updateJob({ step: 'linking_cards', progress: 98, message: 'Finalizando e vinculando tudo…', cardsCreated: created, filesProcessed })
          await updateJob({ status: 'done', step: 'done', progress: 100, message: 'Importação concluída.', cardsCreated: created, filesProcessed })
        } catch (e: any) {
          const msg = e?.message || 'Erro ao importar projeto'
          console.error('[Import Job] erro:', msg)
          await ImportJobModel.update(job.id, {
            status: 'error',
            step: 'error',
            progress: 100,
            message: 'Falha ao importar. Veja o erro abaixo.',
            error: msg
          })
        }
      })
    } catch (error: any) {
      console.error('Erro ao importar do GitHub:', error)
      
      // Determinar código de status baseado no erro
      let statusCode = 400
      let errorMessage = error.message || 'Erro ao importar projeto do GitHub'
      
      if (errorMessage.includes('rate') || errorMessage.includes('limite') || errorMessage.includes('Limite')) {
        statusCode = 429
        errorMessage = 'Limite de requisições do GitHub atingido. Aguarde alguns minutos ou use um token de acesso pessoal para aumentar o limite.'
      } else if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
        statusCode = 504
        errorMessage = 'O repositório é muito grande. Tente importar um repositório menor ou com menos arquivos.'
      } else if (errorMessage.includes('não encontrado') || errorMessage.includes('404')) {
        statusCode = 404
      } else if (errorMessage.includes('Token') || errorMessage.includes('permissão')) {
        statusCode = 401
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage
      })
    }
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

      // Opcional: adicionar membro por email
      if (result.data?.id && data.addMemberEmail && data.addMemberEmail.trim()) {
        await this.tryAddMemberByEmail(result.data.id, data.addMemberEmail.trim(), userId)
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

  private static async tryAddMemberByEmail(projectId: string, email: string, requesterId: string): Promise<void> {
    const normalized = email.toLowerCase().trim()
    if (!normalized) return

    // Buscar usuário na tabela public.users
    const { data } = await executeQuery(
      supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', normalized)
        .maybeSingle()
    )

    const userIdToAdd = data?.id as string | undefined
    if (!userIdToAdd) return
    if (userIdToAdd === requesterId) return

    // Tentar adicionar como MEMBER (se já for membro, ignora)
    const res = await ProjectModel.addMember(projectId, { userId: userIdToAdd }, requesterId)
    if (!res.success && res.statusCode !== 409) {
      console.warn('[AddMemberEmail] falhou:', res.error)
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

      // Se deleteCards=true, deletar os card_features associados
      let cardsDeleted = 0
      if (deleteCards) {
        const cardsResult = await ProjectModel.getCards(id)
        if (cardsResult.success && cardsResult.data) {
          for (const card of cardsResult.data) {
            try {
              await CardFeatureModel.delete(card.cardFeatureId)
              cardsDeleted++
            } catch (e) {
              console.error(`Erro ao deletar card ${card.cardFeatureId}:`, e)
            }
          }
        }
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
        message: deleteCards 
          ? `Projeto e ${cardsDeleted} cards removidos com sucesso`
          : 'Projeto removido com sucesso',
        cardsDeleted
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

