import { ProjectModel } from '@/models/ProjectModel'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import { ImportJobModel, type ImportJobStep, type ImportJobUpdate } from '@/models/ImportJobModel'
import { GitSyncModel } from '@/models/GitSyncModel'
import { GithubService } from '@/services/githubService'
import { GitSyncService } from '@/services/gitSyncService'
import { executeQuery, supabaseAdmin } from '@/database/supabase'
import { Visibility } from '@/types/cardfeature'
import type { CreateCardFeatureRequest } from '@/types/cardfeature'
import {
  ProjectMemberRole,
  type CreateProjectRequest,
  type GetGithubInfoRequest,
  type ImportFromGithubRequest,
  type AddProjectMemberRequest,
  type UpdateProjectMemberRequest,
  type ShareProjectRequest,
  type ValidateGithubTokenRequest,
  type ValidateGithubTokenResponse,
  type ConnectRepoRequest,
  type ResolveConflictRequest
} from '@/types/project'
import {
  safeHandler,
  badRequest,
  requireId,
  respond,
  respondList,
  assertResult,
  parsePagination,
  parseCardPagination
} from '@/middleware/controllerHelpers'

const ALLOWED_MEMBER_ROLES = Object.values(ProjectMemberRole) as ProjectMemberRole[]

export class ProjectController {

  /** POST /api/projects/validate-token */
  static validateGithubToken = safeHandler(async (req, res) => {
    const { token } = req.body as ValidateGithubTokenRequest
    if (!token) throw badRequest('Token é obrigatório')
    const valid = await GithubService.validateToken(token)
    const data: ValidateGithubTokenResponse = {
      valid,
      message: valid ? 'Token válido' : 'Token inválido ou expirado'
    }
    res.json({ success: true, data })
  })

  /** POST /api/projects/github-info */
  static getGithubInfo = safeHandler(async (req, res) => {
    const { url, token } = req.body as GetGithubInfoRequest
    if (!url) throw badRequest('URL é obrigatória')
    const info = await GithubService.getRepoDetails(url, token)
    res.json({ success: true, data: info })
  })

  /** POST /api/projects/import-from-github
   *  Cria projeto, responde 202, e processa import em background. */
  static importFromGithub = safeHandler(async (req, res) => {
    const { url, token, name, description, useAi } = req.body as ImportFromGithubRequest
    const userId = req.user!.id
    if (!url) throw badRequest('URL do repositório é obrigatória')

    // Obter nome/descricao do repo (best-effort)
    let projectName = name
    let projectDescription = description
    if (!projectName) {
      const repoInfo = await GithubService.getRepoDetails(url, token)
      projectName = repoInfo.name
      projectDescription = projectDescription || repoInfo.description || undefined
    }

    // Criar o projeto
    const cleanUrl = url.replace(/\.git$/i, '').split('?')[0] || undefined
    const projectData: CreateProjectRequest = {
      name: projectName || 'Projeto',
      ...(projectDescription ? { description: projectDescription } : {}),
      ...(cleanUrl ? { repositoryUrl: cleanUrl } : {})
    }

    const projectResult = await ProjectModel.create(projectData, userId)
    assertResult(projectResult)
    const projectId = projectResult.data!.id

    // Criar job e responder 202 imediatamente
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

    // Background: processar repo e criar cards
    setImmediate(async () => {
      let lastProgress = 0
      let totalCardsCreated = 0
      let totalFilesProcessed = 0
      let _isProcessing = true
      const progressInterval: NodeJS.Timeout | null = null

      /** Atualiza job garantindo progresso monotônico (nunca decresce). */
      const updateJob = async (patch: ImportJobUpdate) => {
        if (typeof patch.progress === 'number') {
          patch.progress = Math.max(lastProgress, patch.progress)
          lastProgress = patch.progress
        }
        await ImportJobModel.update(job.id, patch)
      }

      try {
        await updateJob({ step: 'downloading_zip', progress: 5, message: 'Baixando o repositório...' })
        const { cards, filesProcessed, aiUsed, aiCardsCreated } = await GithubService.processRepoToCards(
          url, token,
          {
            useAi: useAi === true,
            onProgress: async (p) => {
              await updateJob({
                step: p.step as ImportJobStep,
                progress: p.progress ?? 0,
                message: p.message ?? null,
                cards_created: totalCardsCreated,
                files_processed: totalFilesProcessed
              })
            },
            onCardReady: async (card) => {
              const normalizedCard: CreateCardFeatureRequest = {
                ...card,
                visibility: Visibility.UNLISTED,
                created_in_project_id: projectId
              }
              const createdRes = await CardFeatureModel.bulkCreate([normalizedCard], userId)
              if (!createdRes.success || !createdRes.data?.length) {
                throw new Error(createdRes.error || 'Erro ao criar card')
              }
              const cardId = createdRes.data[0]!.id
              const assoc = await ProjectModel.addCardsBulk(projectId, [cardId], userId)
              if (!assoc.success) throw new Error(assoc.error || 'Erro ao associar card ao projeto')
              totalCardsCreated++
              totalFilesProcessed += card.screens?.reduce((sum, s) => sum + (s.blocks?.length || 0), 0) || 0
            }
          }
        )

        _isProcessing = false
        if (progressInterval) clearInterval(progressInterval)

        if (totalCardsCreated === 0 && cards.length === 0) {
          await updateJob({
            status: 'error', step: 'error', progress: 100,
            message: 'Nenhum arquivo de código encontrado.',
            error: 'Nenhum arquivo de código encontrado.'
          })
          return
        }

        await updateJob({ step: 'linking_cards', progress: 95, message: 'Finalizando...' })
        await updateJob({
          status: 'done', step: 'done', progress: 100,
          message: 'Importação concluída.',
          cards_created: totalCardsCreated || cards.length,
          files_processed: totalFilesProcessed || filesProcessed,
          ai_used: aiUsed,
          ai_cards_created: aiCardsCreated
        })
      } catch (e: unknown) {
        _isProcessing = false
        if (progressInterval) clearInterval(progressInterval)
        await ImportJobModel.update(job.id, {
          status: 'error', step: 'error', progress: 100,
          message: 'Falha ao importar.', error: e instanceof Error ? e.message : 'Erro desconhecido'
        })
      }
    })
  })

  /** POST /api/projects */
  static create = safeHandler(async (req, res) => {
    const data: CreateProjectRequest = req.body
    if (!data.name) throw badRequest('Nome do projeto é obrigatório')
    respond(res, await ProjectModel.create(data, req.user!.id), 'Projeto criado com sucesso', 201)
  })

  /** GET /api/projects */
  static getAll = safeHandler(async (req, res) => {
    const params = parsePagination(req.query)
    const result = await ProjectModel.findAll(params, req.user!.id)
    assertResult(result)

    const totalPages = params.limit ? Math.ceil((result.count || 0) / params.limit) : 1
    const currentPage = params.page || 1

    res.json({
      success: true,
      data: result.data,
      count: result.count,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    })
  })

  /** GET /api/projects/:id */
  static getById = safeHandler(async (req, res) => {
    respond(res, await ProjectModel.findById(requireId(req), req.user!.id))
  })

  /** PUT /api/projects/:id */
  static update = safeHandler(async (req, res) => {
    respond(res, await ProjectModel.update(requireId(req), req.body, req.user!.id), 'Projeto atualizado com sucesso')
  })

  /** DELETE /api/projects/:id */
  static delete = safeHandler(async (req, res) => {
    const id = requireId(req)
    const deleteCards = req.query.deleteCards === 'true'
    const result = await ProjectModel.delete(id, req.user!.id, deleteCards)
    assertResult(result)

    const n = result.data?.cardsDeleted || 0
    res.json({
      success: true,
      message: n > 0 ? `Projeto e ${n} card${n > 1 ? 's' : ''} removidos com sucesso` : 'Projeto removido com sucesso',
      data: { cardsDeleted: n }
    })
  })

  /** GET /api/projects/:id/members */
  static getMembers = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))
    respondList(res, await ProjectModel.getMembers(id))
  })

  /** POST /api/projects/:id/members */
  static addMember = safeHandler(async (req, res) => {
    const id = requireId(req)
    const { userId, role }: AddProjectMemberRequest = req.body
    if (!userId) throw badRequest('ID do usuário é obrigatório')
    if (role && !ALLOWED_MEMBER_ROLES.includes(role)) throw badRequest('Role inválido')
    respond(
      res,
      await ProjectModel.addMember(id, { userId, role: role ?? ProjectMemberRole.MEMBER }, req.user!.id),
      'Membro adicionado com sucesso',
      201
    )
  })

  /** PUT /api/projects/:id/members/:userId */
  static updateMember = safeHandler(async (req, res) => {
    const { id, userId } = req.params
    if (!id || !userId) throw badRequest('ID do projeto e do usuário são obrigatórios')
    const { role }: UpdateProjectMemberRequest = req.body
    if (!role) throw badRequest('Role é obrigatório')
    if (!ALLOWED_MEMBER_ROLES.includes(role)) throw badRequest('Role inválido')
    respond(res, await ProjectModel.updateMember(id, userId, role, req.user!.id), 'Membro atualizado com sucesso')
  })

  /** DELETE /api/projects/:id/members/:userId */
  static removeMember = safeHandler(async (req, res) => {
    const { id, userId } = req.params
    if (!id || !userId) throw badRequest('ID do projeto e do usuário são obrigatórios')
    respond(res, await ProjectModel.removeMember(id, userId, req.user!.id), 'Membro removido com sucesso')
  })

  /** POST /api/projects/:id/share
   *  Resolve emails/userIds, valida existencia, e adiciona como membros. */
  static shareProject = safeHandler(async (req, res) => {
    const id = requireId(req)
    const { userIds, emails }: ShareProjectRequest = req.body
    const requesterId = req.user!.id

    const rawUserIds = Array.isArray(userIds) ? userIds.filter(Boolean) : []
    const normalizedEmails = Array.from(new Set(
      (Array.isArray(emails) ? emails : [])
        .map(e => typeof e === 'string' ? e.toLowerCase().trim() : '')
        .filter(Boolean)
    ))

    if (rawUserIds.length === 0 && normalizedEmails.length === 0) {
      throw badRequest('Informe ao menos um userId ou email')
    }

    const failed: Array<{ userIdOrEmail: string; error: string }> = []
    const ignored: Array<{ userIdOrEmail: string; reason: string }> = []

    // Resolver emails → user IDs
    const resolvedEmailIds: string[] = []
    if (normalizedEmails.length > 0) {
      const { data: emailUsers } = await executeQuery<{ id: string; email: string }[] | null>(
        supabaseAdmin.from('users').select('id, email').in('email', normalizedEmails)
      )
      const emailMap = new Map<string, string>()
      emailUsers?.forEach((u) => {
        if (u?.email && u?.id) emailMap.set(String(u.email).toLowerCase(), String(u.id))
      })
      normalizedEmails.forEach(email => {
        const foundId = emailMap.get(email)
        if (foundId) resolvedEmailIds.push(foundId)
        else failed.push({ userIdOrEmail: email, error: 'email_not_found' })
      })
    }

    // Validar userIds existem no banco
    const normalizedUserIds = Array.from(new Set(rawUserIds.map(String))).filter(Boolean)
    let validUserIds: string[] = []
    if (normalizedUserIds.length > 0) {
      const { data: userRows } = await executeQuery<{ id: string }[] | null>(
        supabaseAdmin.from('users').select('id').in('id', normalizedUserIds)
      )
      const validIdSet = new Set((userRows || []).map((r) => String(r.id)))
      validUserIds = normalizedUserIds.filter(uid => validIdSet.has(uid))
      normalizedUserIds.forEach(uid => {
        if (!validIdSet.has(uid)) failed.push({ userIdOrEmail: uid, error: 'user_not_found' })
      })
    }

    // Combinar IDs, remover requester, adicionar em bulk
    const combinedIds = Array.from(new Set([...validUserIds, ...resolvedEmailIds]))
    const filteredIds = combinedIds.filter(uid => {
      if (uid === requesterId) {
        ignored.push({ userIdOrEmail: uid, reason: 'requester' })
        return false
      }
      return true
    })

    const result = await ProjectModel.addMembersBulk(id, filteredIds, requesterId)
    assertResult(result)

    const insertedIds = result.data?.insertedIds || []
    ;(result.data?.ignoredIds || []).forEach(uid => {
      ignored.push({ userIdOrEmail: uid, reason: 'already_member_or_owner' })
    })

    res.json({
      success: true,
      data: { addedIds: insertedIds, ignored, failed },
      message: 'Compartilhamento processado'
    })
  })

  /** GET /api/projects/:id/cards */
  static getCards = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))
    const { limit, offset } = parseCardPagination(req.query)
    respondList(res, await ProjectModel.getCards(id, limit, offset))
  })

  /** GET /api/projects/:id/cards/all */
  static getCardsAll = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))
    respondList(res, await ProjectModel.getCardsAll(id))
  })

  /** POST /api/projects/:id/cards */
  static addCard = safeHandler(async (req, res) => {
    const id = requireId(req)
    const { cardFeatureId } = req.body
    if (!cardFeatureId) throw badRequest('ID do card é obrigatório')
    respond(res, await ProjectModel.addCard(id, cardFeatureId, req.user!.id), 'Card adicionado ao projeto com sucesso', 201)
  })

  /** DELETE /api/projects/:id/cards/:cardFeatureId */
  static removeCard = safeHandler(async (req, res) => {
    const { id, cardFeatureId } = req.params
    if (!id || !cardFeatureId) throw badRequest('ID do projeto e do card são obrigatórios')
    respond(res, await ProjectModel.removeCard(id, cardFeatureId, req.user!.id), 'Card removido do projeto com sucesso')
  })

  /** PATCH /api/projects/:id/cards/:cardFeatureId/reorder */
  static reorderCard = safeHandler(async (req, res) => {
    const { id, cardFeatureId } = req.params
    if (!id || !cardFeatureId) throw badRequest('ID do projeto e do card são obrigatórios')
    const { direction } = req.body
    if (direction !== 'up' && direction !== 'down') throw badRequest('Direção deve ser "up" ou "down"')
    respond(res, await ProjectModel.reorderCard(id, cardFeatureId, direction, req.user!.id), 'Card reordenado com sucesso')
  })

  // ================================================
  // GITSYNC ENDPOINTS
  // ================================================

  /** GET /api/projects/gitsync/repos
   *  Lista repos acessiveis via GitHub App installation */
  static listGithubRepos = safeHandler(async (req, res) => {
    const installationId = Number(req.query.installation_id)
    if (!installationId) throw badRequest('installation_id é obrigatório')

    const repos = await GithubService.listInstallationRepos(installationId)
    res.json({ success: true, data: repos, count: repos.length })
  })

  /** POST /api/projects/:id/gitsync/connect
   *  Conecta um projeto a um repo GitHub */
  static connectRepo = safeHandler(async (req, res) => {
    const id = requireId(req)
    const { installationId, owner, repo, defaultBranch } = req.body as ConnectRepoRequest
    if (!installationId || !owner || !repo) {
      throw badRequest('installationId, owner e repo são obrigatórios')
    }

    // Verificar se o user tem acesso ao projeto
    assertResult(await ProjectModel.findById(id, req.user!.id))

    // Salvar dados de sync no projeto
    const updateResult = await ProjectModel.updateSyncInfo(id, {
      github_installation_id: installationId,
      github_owner: owner,
      github_repo: repo,
      default_branch: defaultBranch || 'main',
      gitsync_active: true,
      last_sync_at: new Date().toISOString()
    })
    assertResult(updateResult)

    res.json({
      success: true,
      data: updateResult.data,
      message: 'Repositório conectado com sucesso'
    })
  })

  /** DELETE /api/projects/:id/gitsync/connect
   *  Desconecta o projeto do GitHub */
  static disconnectRepo = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))

    // Limpar dados de sync
    const updateResult = await ProjectModel.updateSyncInfo(id, {
      github_installation_id: null,
      github_owner: null,
      github_repo: null,
      default_branch: null,
      gitsync_active: false,
      last_sync_at: null,
      last_sync_sha: null
    })
    assertResult(updateResult)

    // Remover file mappings
    await GitSyncModel.deleteByProject(id)

    res.json({
      success: true,
      message: 'Repositório desconectado com sucesso'
    })
  })

  /** GET /api/projects/:id/gitsync/status
   *  Retorna status de sync do projeto */
  static getSyncStatus = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))

    const syncInfo = await ProjectModel.getSyncInfo(id)
    assertResult(syncInfo)

    const conflicts = await GitSyncModel.countConflicts(id)
    const mappings = await GitSyncModel.getMappingsByProject(id)

    res.json({
      success: true,
      data: {
        active: syncInfo.data?.gitsync_active || false,
        lastSyncAt: syncInfo.data?.last_sync_at || null,
        lastSyncSha: syncInfo.data?.last_sync_sha || null,
        githubOwner: syncInfo.data?.github_owner || null,
        githubRepo: syncInfo.data?.github_repo || null,
        defaultBranch: syncInfo.data?.default_branch || null,
        conflicts,
        totalMappings: mappings.count || 0
      }
    })
  })

  /** POST /api/projects/:id/gitsync/sync
   *  Trigger manual de sync GitHub -> Cards */
  static syncProject = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))

    const syncInfo = await ProjectModel.getSyncInfo(id)
    assertResult(syncInfo)

    if (!syncInfo.data?.gitsync_active) {
      throw badRequest('GitSync não está ativo neste projeto')
    }

    const result = await GitSyncService.syncFromGithub(id)

    if (!result.success) {
      throw badRequest(result.error || 'Erro ao sincronizar')
    }

    res.json({
      success: true,
      data: {
        filesUpdated: result.filesUpdated,
        filesAdded: result.filesAdded,
        filesRemoved: result.filesRemoved
      },
      message: result.filesUpdated > 0
        ? `Sincronização concluída: ${result.filesUpdated} arquivo(s) atualizado(s)`
        : 'Projeto já está atualizado'
    })
  })

  /** POST /api/projects/:id/gitsync/push
   *  Envia mudancas de um card para o GitHub como PR */
  static pushToGithub = safeHandler(async (req, res) => {
    const id = requireId(req)
    const { cardFeatureId } = req.body
    if (!cardFeatureId) throw badRequest('cardFeatureId é obrigatório')

    assertResult(await ProjectModel.findById(id, req.user!.id))

    const result = await GitSyncService.syncToGithub(id, cardFeatureId)

    if (!result.success) {
      throw badRequest(result.error || 'Erro ao enviar para o GitHub')
    }

    res.json({
      success: true,
      data: {
        prUrl: result.prUrl,
        prNumber: result.prNumber
      },
      message: `Pull Request #${result.prNumber} criada com sucesso`
    })
  })

  /** POST /api/projects/:id/gitsync/resolve
   *  Resolve um conflito de sync */
  static resolveConflict = safeHandler(async (req, res) => {
    const id = requireId(req)
    const { fileMappingId, resolution } = req.body as ResolveConflictRequest
    if (!fileMappingId || !resolution) {
      throw badRequest('fileMappingId e resolution são obrigatórios')
    }
    if (resolution !== 'keep_card' && resolution !== 'keep_github') {
      throw badRequest('resolution deve ser "keep_card" ou "keep_github"')
    }

    assertResult(await ProjectModel.findById(id, req.user!.id))

    const result = await GitSyncService.resolveConflict(id, fileMappingId, resolution)
    if (!result.success) {
      throw badRequest(result.error || 'Erro ao resolver conflito')
    }

    res.json({
      success: true,
      message: `Conflito resolvido: ${resolution === 'keep_card' ? 'versão do card mantida' : 'versão do GitHub aplicada'}`
    })
  })

}
