import { randomUUID } from 'crypto'
import type { Request, Response } from 'express'
import { ProjectModel } from '@/models/ProjectModel'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import { ImportJobModel, type ImportJobStep, type ImportJobUpdate } from '@/models/ImportJobModel'
import { GithubModel } from '@/models/GithubModel'
import { GithubService } from '@/services/githubService'
import { AiCardGroupingService } from '@/services/aiCardGroupingService'
import { resolveApiKey, resolveChatCompletionsUrl, callChatCompletions } from '@/services/llmClient'
import { executeQuery, supabaseAdmin } from '@/database/supabase'
import { Visibility, ContentType, CardType } from '@/types/cardfeature'
import type { CreateCardFeatureRequest, FlowItem, FlowLayer } from '@/types/cardfeature'
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
    const { url, token, name, description, installationId } = req.body as ImportFromGithubRequest
    const userId = req.user!.id
    if (!url) throw badRequest('URL do repositório é obrigatória')

    // Obter token: usar installationId se disponível, senão usar token fornecido
    let accessToken = token
    if (!accessToken && installationId) {
      accessToken = await GithubService.getInstallationToken(installationId)
    }

    // Obter nome/descricao do repo (best-effort)
    let projectName = name
    let projectDescription = description
    if (!projectName) {
      const repoInfo = await GithubService.getRepoDetails(url, accessToken)
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
      ai_requested: true
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
      const progressLog: string[] = []

      /** Atualiza job garantindo progresso monotônico (nunca decresce). */
      const updateJob = async (patch: ImportJobUpdate) => {
        if (typeof patch.progress === 'number') {
          patch.progress = Math.max(lastProgress, patch.progress)
          lastProgress = patch.progress
        }
        await ImportJobModel.update(job.id, patch)
      }

      try {
        progressLog.push('Baixando o repositório...')
        await updateJob({ step: 'downloading_zip', progress: 5, message: 'Baixando o repositório...', progress_log: [...progressLog] })

        const repoInfo = GithubService.parseGithubUrl(url)
        if (!repoInfo) {
          throw new Error('URL do GitHub inválida')
        }

        // Obter token novamente (escopo correto)
        let finalToken = accessToken
        if (!finalToken && installationId) {
          finalToken = await GithubService.getInstallationToken(installationId)
        }

        // Obter branch padrão real do repositório
        const repoDetails = await GithubService.getRepoDetails(url, finalToken || undefined)
        const defaultBranch = repoDetails.defaultBranch

        // Fluxo unificado: se veio via GitHub App (installationId),
        // a importação já conecta e ativa o sync no mesmo passo.
        if (installationId) {
          progressLog.push('Conectando repositório para sincronização contínua...')
          await updateJob({
            step: 'downloading_zip',
            progress: 8,
            message: 'Conectando repositório para sincronização contínua...',
            progress_log: [...progressLog]
          })

          const skippedFiles: Array<{ path: string; reason: string }> = []
          const filesForReport = await GithubService.listRepoFiles(
            repoInfo.owner,
            repoInfo.repo,
            defaultBranch,
            finalToken || undefined,
            { onSkipped: (path, reason) => skippedFiles.push({ path, reason }) }
          )
          const fileReportInstallation = {
            included: filesForReport.map((f) => f.path),
            ignored: skippedFiles
          }
          progressLog.push(`Arquivos listados: ${filesForReport.length} incluídos, ${skippedFiles.length} ignorados`)
          await updateJob({
            file_report_json: fileReportInstallation,
            progress_log: [...progressLog]
          })

          if (await ImportJobModel.isCancelled(job.id)) return

          const connectResult = await GithubService.connectRepo(
            projectId,
            installationId,
            repoInfo.owner,
            repoInfo.repo,
            userId,
            {
              defaultBranch,
              onProgress: async (step, progress, message) => {
                if (await ImportJobModel.isCancelled(job.id)) throw new Error('CANCELLED')
                if (message) progressLog.push(message)
                await updateJob({
                  step: step as ImportJobStep,
                  progress,
                  message: message || null,
                  progress_log: [...progressLog]
                })
              }
            }
          )

          if (!connectResult.success) {
            throw new Error(connectResult.error || 'Erro ao conectar repositório após importação')
          }

          const cardsResult = await ProjectModel.getCardsAll(projectId)
          const cardsCreated = cardsResult.count || 0

          await updateJob({
            status: 'done',
            step: 'done',
            progress: 100,
            message: 'Importação concluída e sincronização com GitHub ativada.',
            cards_created: cardsCreated,
            files_processed: connectResult.mappingsCreated,
            ai_used: true,
            ai_cards_created: cardsCreated,
            file_report_json: fileReportInstallation
          })
          return
        }

        const branch = 'main'
        const skippedFiles: Array<{ path: string; reason: string }> = []
        const files = await GithubService.listRepoFiles(
          repoInfo.owner, repoInfo.repo, branch, finalToken || undefined,
          { onSkipped: (path, reason) => skippedFiles.push({ path, reason }) }
        )
        const fileReport = {
          included: files.map(f => f.path),
          ignored: skippedFiles
        }

        progressLog.push(`Arquivos listados: ${files.length} incluídos, ${skippedFiles.length} ignorados`)
        await updateJob({
          file_report_json: fileReport,
          progress_log: [...progressLog]
        })

        if (files.length === 0) {
          throw new Error('Nenhum arquivo de código encontrado no repositório.')
        }

        if (await ImportJobModel.isCancelled(job.id)) return

        const { cards, filesProcessed, aiCardsCreated, tokenUsage } = await AiCardGroupingService.generateCardGroupsFromRepo(
          files,
          url,
          {
            onLog: async (msg) => {
              progressLog.push(msg)
              await ImportJobModel.update(job.id, { progress_log: [...progressLog] })
            },
            onProgress: async (p) => {
              if (await ImportJobModel.isCancelled(job.id)) throw new Error('CANCELLED')
              const msg = p.message ?? null
              const msgWithTokens = p.tokenUsage && msg
                ? `${msg} (${p.tokenUsage.prompt_tokens} + ${p.tokenUsage.completion_tokens} tokens)`
                : msg
              await updateJob({
                step: p.step as ImportJobStep,
                progress: p.progress ?? 0,
                message: msgWithTokens,
                cards_created: totalCardsCreated,
                files_processed: totalFilesProcessed
              })
            },
            onCardReady: async (card) => {
              if (await ImportJobModel.isCancelled(job.id)) throw new Error('CANCELLED')
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
        const doneMessage = tokenUsage
          ? `Importação concluída. Tokens: ${tokenUsage.prompt_tokens} prompt + ${tokenUsage.completion_tokens} completion = ${tokenUsage.total_tokens} total`
          : 'Importação concluída.'
        await updateJob({
          status: 'done', step: 'done', progress: 100,
          message: doneMessage,
          cards_created: totalCardsCreated || cards.length,
          files_processed: totalFilesProcessed || filesProcessed,
          ai_used: true,
          ai_cards_created: aiCardsCreated,
          file_report_json: fileReport
        })
      } catch (e: unknown) {
        _isProcessing = false
        if (progressInterval) clearInterval(progressInterval)
        if (e instanceof Error && e.message === 'CANCELLED') return
        await ImportJobModel.update(job.id, {
          status: 'error', step: 'error', progress: 100,
          message: 'Falha ao importar.', error: e instanceof Error ? e.message : 'Erro desconhecido'
        })
      }
    })
  })

  /** POST /api/projects/jobs/:jobId/cancel */
  static cancelJob = safeHandler(async (req, res) => {
    if (!req.user) throw badRequest('Não autenticado')
    const { jobId } = req.params
    if (!jobId) throw badRequest('jobId é obrigatório')

    const { data } = await executeQuery(
      supabaseAdmin
        .from('import_jobs')
        .select('id, created_by, status')
        .eq('id', jobId)
        .single()
    )

    if (!data) throw badRequest('Job não encontrado')
    const row = data as { id: string; created_by: string; status: string }
    if (row.created_by !== req.user.id && req.user.role !== 'admin') throw badRequest('Sem permissão')
    if (row.status !== 'running') throw badRequest('Job não está em execução')

    await ImportJobModel.update(jobId, {
      status: 'cancelled',
      message: 'Importação cancelada pelo usuário.'
    })

    res.json({ success: true, message: 'Importação cancelada.' })
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
    respond(res, await ProjectModel.update(requireId(req), req.body, req.user!.id, req.user!.role), 'Projeto atualizado com sucesso')
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
    const branch = typeof req.query.branch === 'string' ? req.query.branch : undefined
    respondList(res, await ProjectModel.getCards(id, limit, offset, branch))
  })

  /** GET /api/projects/:id/cards/all */
  static getCardsAll = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))
    const branch = typeof req.query.branch === 'string' ? req.query.branch : undefined
    respondList(res, await ProjectModel.getCardsAll(id, branch))
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
  // GITHUB SYNC ENDPOINTS
  // ================================================

  /** GET /api/projects/github/repos
   *  Lista repos acessiveis via GitHub App installation */
  static listGithubRepos = safeHandler(async (req, res) => {
    const installationId = Number(req.query.installation_id)
    if (!installationId) throw badRequest('installation_id é obrigatório')

    try {
      const repos = await GithubService.listInstallationRepos(installationId)
      res.json({ success: true, data: repos, count: repos.length })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: unknown }; message?: string }
      const status = axiosErr.response?.status
      const detail = axiosErr.response?.data
      console.error('[listGithubRepos] Erro GitHub:', { installationId, status, detail, message: axiosErr.message })
      if (status === 404) {
        const e = new Error('Instalação não encontrada. Instale o app 10xDev no GitHub.') as Error & { statusCode: number }
        e.statusCode = 404
        throw e
      }
      if (status === 403) {
        const e = new Error('Sem permissão para acessar esta instalação.') as Error & { statusCode: number }
        e.statusCode = 403
        throw e
      }
      throw err
    }
  })

  /** GET /api/projects/:id/github/branches */
  static listBranches = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))

    const syncInfo = await ProjectModel.getSyncInfo(id)
    assertResult(syncInfo)

    const { github_installation_id, github_owner, github_repo } = syncInfo.data!
    if (!github_installation_id || !github_owner || !github_repo) {
      throw badRequest('Projeto não tem repositório GitHub conectado')
    }

    const token = await GithubService.getInstallationToken(github_installation_id)
    const branches = await GithubService.listBranches(token, github_owner, github_repo)

    res.json({ success: true, data: branches })
  })

  /** GET /api/projects/:id/github/commits?branch=<branch>&page=<n> */
  static listCommits = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))

    const syncInfo = await ProjectModel.getSyncInfo(id)
    assertResult(syncInfo)

    const { github_installation_id, github_owner, github_repo } = syncInfo.data!
    if (!github_installation_id || !github_owner || !github_repo) {
      throw badRequest('Projeto não tem repositório GitHub conectado')
    }

    const branch = (req.query.branch as string | undefined) ?? syncInfo.data!.default_branch ?? 'main'
    const page = parseInt(req.query.page as string) || 1

    const token = await GithubService.getInstallationToken(github_installation_id)
    const commits = await GithubService.listCommits(token, github_owner, github_repo, branch, 30, page)

    res.json({ success: true, data: commits })
  })

  /** GET /api/projects/:id/github/commits/:sha */
  static getCommit = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))

    const syncInfo = await ProjectModel.getSyncInfo(id)
    assertResult(syncInfo)

    const { github_installation_id, github_owner, github_repo } = syncInfo.data!
    if (!github_installation_id || !github_owner || !github_repo) {
      throw badRequest('Projeto não tem repositório GitHub conectado')
    }

    const sha = req.params['sha']
    if (!sha) throw badRequest('sha é obrigatório')

    const branch = (req.query.branch as string | undefined) ?? syncInfo.data!.default_branch ?? 'main'

    const token = await GithubService.getInstallationToken(github_installation_id)
    const detail = await GithubService.getCommitDetail(token, github_owner, github_repo, sha)

    // Enriquecer cada arquivo com o card mapeado
    const enrichedFiles = await Promise.all(
      detail.files.map(async file => {
        let mapping = await GithubModel.getMappingByFilePath(id, file.filename, branch)

        if (!mapping.success || !mapping.data) {
          const routeMatch = await ProjectModel.findCardByFilePath(id, file.filename, branch)
          if (routeMatch.success && routeMatch.data) {
            await GithubModel.upsertMappingsBulk([{
              project_id: id,
              card_feature_id: routeMatch.data.cardFeatureId,
              file_path: file.filename,
              branch_name: branch,
              last_synced_at: new Date().toISOString()
            }])
            mapping = await GithubModel.getMappingByFilePath(id, file.filename, branch)
          }
        }

        if (mapping.success && mapping.data) {
          const card = await CardFeatureModel.findById(mapping.data.card_feature_id)
          if (card.success && card.data) {
            return { ...file, card: { id: card.data.id, title: card.data.title } }
          }
        }
        return file
      })
    )

    const mappedCount = enrichedFiles.filter((file) => Boolean(file.card?.id)).length
    const unmappedCount = enrichedFiles.length - mappedCount
    console.info('[getCommit] mapping coverage', {
      projectId: id,
      branch,
      sha,
      filesCount: enrichedFiles.length,
      mappedCount,
      unmappedCount
    })

    res.json({ success: true, data: { ...detail, files: enrichedFiles } })
  })

  /** POST /api/projects/:id/github/connect
   *  Conecta um projeto a um repo GitHub e importa cards do código */
  static connectRepo = safeHandler(async (req, res) => {
    const id = requireId(req)
    const { installationId, owner, repo, defaultBranch } = req.body as ConnectRepoRequest
    if (!installationId || !owner || !repo) {
      throw badRequest('installationId, owner e repo são obrigatórios')
    }

    assertResult(await ProjectModel.findById(id, req.user!.id))

    const job = await ImportJobModel.create({
      project_id: id,
      created_by: req.user!.id,
      status: 'running',
      step: 'starting',
      progress: 0,
      message: 'Iniciando conexão com o repositório...',
      ai_requested: true
    })

    let lastProgress = 0
    const updateJob = async (patch: ImportJobUpdate) => {
      if (typeof patch.progress === 'number') {
        patch.progress = Math.max(lastProgress, patch.progress)
        lastProgress = patch.progress
      }
      await ImportJobModel.update(job.id, patch)
    }

    try {
      const result = await GithubService.connectRepo(
        id,
        installationId,
        owner,
        repo,
        req.user!.id,
        {
          defaultBranch: defaultBranch || 'main',
          onProgress: async (step, progress, message) => {
            await updateJob({
              step: step as ImportJobStep,
              progress,
              message: message || null
            })
          }
        }
      )

      if (!result.success) {
        await updateJob({
          status: 'error',
          step: 'error',
          progress: 100,
          message: result.error || 'Falha ao conectar repositório',
          error: result.error || 'Falha ao conectar repositório'
        })
        throw { statusCode: 500, message: result.error || 'Erro ao importar cards do repositório' }
      }

      const projectRes = await ProjectModel.findById(id, req.user!.id)
      assertResult(projectRes)

      await updateJob({
        status: 'done',
        step: 'done',
        progress: 100,
        message: result.mappingsCreated > 0
          ? `Conexão concluída. ${result.mappingsCreated} arquivo(s) mapeado(s).`
          : 'Conexão concluída. Nenhum arquivo de código detectado.'
      })

      res.json({
        success: true,
        data: projectRes.data,
        message: result.mappingsCreated > 0
          ? `Repositório conectado. ${result.mappingsCreated} arquivo(s) mapeado(s) para cards.`
          : 'Repositório conectado. Nenhum arquivo de código detectado (verifique a estrutura do projeto).'
      })
    } catch (error: unknown) {
      await updateJob({
        status: 'error',
        step: 'error',
        progress: 100,
        message: error instanceof Error ? error.message : 'Falha ao conectar repositório',
        error: error instanceof Error ? error.message : 'Falha ao conectar repositório'
      })
      throw error
    }
  })

  /** POST /api/projects/:id/github/import-branch */
  static importBranch = safeHandler(async (req, res) => {
    const id = requireId(req)
    const { branch } = req.body as { branch: string }
    if (!branch) throw badRequest('branch é obrigatório')

    assertResult(await ProjectModel.findById(id, req.user!.id))

    const syncInfo = await ProjectModel.getSyncInfo(id)
    assertResult(syncInfo)

    const { github_installation_id, github_owner, github_repo } = syncInfo.data!
    if (!github_installation_id || !github_owner || !github_repo) {
      throw badRequest('Projeto não tem repositório GitHub conectado')
    }

    const result = await GithubService.importBranch(
      id,
      github_installation_id,
      github_owner,
      github_repo,
      branch,
      req.user!.id
    )

    if (!result.success) {
      res.status(500).json({ success: false, error: result.error })
      return
    }

    res.json({
      success: true,
      data: { cardsCreated: result.cardsCreated, branch }
    })
  })

  /** DELETE /api/projects/:id/github/connect
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
      github_sync_active: false,
      last_sync_at: null,
      last_sync_sha: null
    })
    assertResult(updateResult)

    // Remover file mappings
    assertResult(await GithubModel.deleteByProject(id))

    res.json({
      success: true,
      message: 'Repositório desconectado com sucesso'
    })
  })

  /** GET /api/projects/:id/github/status
   *  Retorna status de sync do projeto */
  static getSyncStatus = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))

    const syncInfo = await ProjectModel.getSyncInfo(id)
    assertResult(syncInfo)

    const conflicts = await GithubModel.countConflicts(id)
    const mappings = await GithubModel.getMappingsByProject(id)
    const sync = syncInfo.data

    let remoteSha: string | null = null
    let hasUpdates = false
    let remoteCheckError: string | null = null

    if (
      sync?.github_sync_active &&
      sync.github_installation_id &&
      sync.github_owner &&
      sync.github_repo
    ) {
      try {
        const branch = sync.default_branch || 'main'
        const token = await GithubService.getInstallationToken(sync.github_installation_id)
        remoteSha = await GithubService.getLatestCommitSha(
          token,
          sync.github_owner,
          sync.github_repo,
          branch
        )
        hasUpdates = Boolean(remoteSha && remoteSha !== sync.last_sync_sha)
      } catch (error) {
        remoteCheckError = error instanceof Error ? error.message : 'Não foi possível verificar atualizações no GitHub'
      }
    }

    res.json({
      success: true,
      data: {
        active: sync?.github_sync_active || false,
        lastSyncAt: sync?.last_sync_at || null,
        lastSyncSha: sync?.last_sync_sha || null,
        remoteSha,
        hasUpdates,
        remoteCheckError,
        githubOwner: sync?.github_owner || null,
        githubRepo: sync?.github_repo || null,
        defaultBranch: sync?.default_branch || null,
        conflicts,
        totalMappings: mappings.count || 0
      }
    })
  })

  /** POST /api/projects/:id/github/sync
   *  Trigger manual de sync GitHub -> Cards */
  static syncProject = safeHandler(async (req, res) => {
    const id = requireId(req)
    assertResult(await ProjectModel.findById(id, req.user!.id))

    const syncInfo = await ProjectModel.getSyncInfo(id)
    assertResult(syncInfo)

    if (!syncInfo.data?.github_sync_active) {
      throw badRequest('GitSync não está ativo neste projeto')
    }

    const result = await GithubService.syncFromGithub(id)

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

  /** POST /api/projects/:id/github/push
   *  Envia mudancas de um card para o GitHub como PR */
  static pushToGithub = safeHandler(async (req, res) => {
    const id = requireId(req)
    const { cardFeatureId } = req.body
    if (!cardFeatureId) throw badRequest('cardFeatureId é obrigatório')

    assertResult(await ProjectModel.findById(id, req.user!.id))

    const result = await GithubService.syncToGithub(id, cardFeatureId)

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

  /** POST /api/projects/:id/github/resolve
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

    const result = await GithubService.resolveConflict(id, fileMappingId, resolution)
    if (!result.success) {
      throw badRequest(result.error || 'Erro ao resolver conflito')
    }

    res.json({
      success: true,
      message: `Conflito resolvido: ${resolution === 'keep_card' ? 'versão do card mantida' : 'versão do GitHub aplicada'}`
    })
  })

  /** POST /api/projects/:id/cards/generate-flow — streaming NDJSON */
  static generateFlowCard = async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Cache-Control', 'no-cache')
    res.flushHeaders()

    const emit = (data: object) => res.write(JSON.stringify(data) + '\n')

    try {
      if (!req.user) {
        emit({ type: 'error', message: 'Não autenticado' })
        res.end(); return
      }

      const id = req.params['id']
      if (!id) {
        emit({ type: 'error', message: 'ID do projeto é obrigatório' })
        res.end(); return
      }

      const { searchTerm, branch } = req.body as { searchTerm?: string; branch?: string }
      if (!searchTerm?.trim()) {
        emit({ type: 'error', message: 'searchTerm é obrigatório' })
        res.end(); return
      }

      // Passo 1
      emit({ type: 'step', label: 'Verificando acesso ao projeto...' })
      const projectResult = await ProjectModel.findById(id, req.user.id)
      if (!projectResult.success) {
        emit({ type: 'error', message: 'Projeto não encontrado ou sem acesso' })
        res.end(); return
      }

      // Passo 2
      emit({ type: 'step', label: 'Buscando código importado...' })
      const cardsResult = await ProjectModel.getCardsAll(id, branch)
      if (!cardsResult.success || !cardsResult.data?.length) {
        emit({ type: 'error', message: 'Projeto não tem cards importados para gerar um flow' })
        res.end(); return
      }

      const allBlocks: Array<{ route: string; content: string; language?: string }> = []
      for (const projectCard of cardsResult.data) {
        const cf = projectCard.cardFeature
        if (!cf) continue
        for (const screen of cf.screens ?? []) {
          for (const block of screen.blocks ?? []) {
            if (block.route && block.content) {
              allBlocks.push({ route: block.route, content: block.content, ...(block.language ? { language: block.language } : {}) })
            }
          }
        }
      }

      if (!allBlocks.length) {
        emit({ type: 'error', message: 'Nenhum bloco com código encontrado no projeto' })
        res.end(); return
      }

      // Passo 3 — word boundary para evitar match em substrings (ex: "async" ao buscar "sync")
      const termRaw = searchTerm.trim()
      const termRegex = new RegExp(`\\b${termRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      const matchedBlocks = allBlocks.filter(b =>
        termRegex.test(b.route) || termRegex.test(b.content)
      )

      if (!matchedBlocks.length) {
        emit({ type: 'error', message: `Nenhuma referência a "${searchTerm}" encontrada no código importado` })
        res.end(); return
      }

      emit({ type: 'step', label: `${allBlocks.length} blocos encontrados — ${matchedBlocks.length} com referência a "${searchTerm}"` })

      const allRoutes = [...new Set(allBlocks.map(b => b.route))]
      const matchedSection = matchedBlocks
        .map(b => `### ${b.route}\n\`\`\`${b.language || ''}\n${b.content}\n\`\`\``)
        .join('\n\n')

      const prompt = `Você é um especialista em arquitetura de software.

O usuário quer entender o flow de: "${searchTerm}"

## Arquivos com match direto (conteúdo completo)

Esses arquivos contêm referências diretas ao termo "${searchTerm}".
Use-os como ponto de entrada para traçar o flow.

${matchedSection}

## Todos os arquivos disponíveis no projeto (só paths)

Se o flow referenciar arquivos que não estão acima, consulte esta lista
para saber quais existem. Use os paths para nomear as screens mesmo sem o conteúdo.

${allRoutes.join('\n')}

## Instrução

Trace o caminho crítico de execução do flow "${searchTerm}":
1. Identifique o entry point (geralmente no frontend)
2. Siga as chamadas: componente → API call → rota → controller → service → model → query
3. Pare nas queries do banco — não inclua schema ou migrations
4. Para cada arquivo no caminho, extraia apenas os trechos diretamente envolvidos

Gere um card com uma screen por arquivo, ordenadas pela execução: frontend → api → backend → database.

Regras para o JSON:
- "name" da screen: nome curto descritivo do papel do arquivo (ex: "Frontend Trigger", "API Route", "Controller"). NÃO inclua o nome do arquivo no name.
- "route" da screen e dos blocks: caminho relativo COMPLETO do arquivo (ex: "frontend/pages/ProjectDetail.tsx", "backend/src/controllers/ProjectController.ts"). Use exatamente o path que aparece nos arquivos listados acima.
- Cada block deve ter o mesmo "route" da screen que pertence.

Retorne apenas JSON válido:
{
  "title": "string",
  "description": "string",
  "tags": ["string"],
  "screens": [
    {
      "name": "string",
      "description": "string",
      "route": "frontend/pages/ExamplePage.tsx",
      "blocks": [
        { "type": "code", "title": "string", "content": "string", "language": "string", "route": "frontend/pages/ExamplePage.tsx", "order": 0 }
      ]
    }
  ]
}`

      // Passo 4
      emit({ type: 'step', label: 'IA traçando o caminho crítico...' })

      const apiKey = resolveApiKey()
      if (!apiKey) {
        emit({ type: 'error', message: 'API key não configurada' })
        res.end(); return
      }

      const aiResponse = await callChatCompletions({
        endpoint: resolveChatCompletionsUrl(),
        apiKey,
        body: { model: 'grok-4-1-fast-reasoning', messages: [{ role: 'user', content: prompt }], temperature: 0.2 }
      })

      // Passo 5
      emit({ type: 'step', label: 'Interpretando resposta e montando o card...' })

      const raw = aiResponse.content.trim()
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (codeBlock) {
          parsed = JSON.parse(codeBlock[1]!.trim())
        } else {
          const first = raw.indexOf('{')
          const last = raw.lastIndexOf('}')
          if (first >= 0 && last > first) {
            parsed = JSON.parse(raw.slice(first, last + 1))
          } else {
            emit({ type: 'error', message: 'Resposta da IA não é JSON válido' })
            res.end(); return
          }
        }
      }

      const data = parsed as {
        title?: string
        description?: string
        tags?: string[]
        screens?: Array<{
          name?: string
          description?: string
          route?: string
          blocks?: Array<{ type?: string; title?: string; content?: string; language?: string; route?: string; order?: number }>
        }>
      }

      if (!data.title || !data.screens?.length) {
        emit({ type: 'error', message: 'Resposta da IA inválida: campos obrigatórios ausentes' })
        res.end(); return
      }

      // Inferir FlowLayer a partir do route (frontend → api → backend → database)
      const inferLayer = (route: string | null | undefined): FlowLayer => {
        if (!route) return 'service'
        const r = route.toLowerCase()
        if (r.includes('frontend') || r.includes('/pages/') || r.includes('/components/')) return 'frontend'
        if (r.includes('/routes/') || r.includes('/api/')) return 'api'
        if (r.includes('/controllers/') || r.includes('/services/')) return 'backend'
        if (r.includes('/models/') || r.includes('supabase') || r.includes('.sql') || r.includes('database')) return 'database'
        return 'service'
      }

      const flowItems: FlowItem[] = data.screens.map((screen) => ({
        label: (screen.name || 'Arquivo').replace(/\s*\([^)]*\)\s*/g, '').trim() || 'Arquivo',
        layer: inferLayer(screen.route),
        description: screen.description || '',
        ...(screen.route ? { file: screen.route } : {})
      }))

      const codeScreens = data.screens.map(screen => {
        // A IA às vezes coloca o arquivo entre parênteses no nome: "Frontend Trigger (ProjectDetail.tsx)"
        // Extraímos a rota do parêntese e limpamos o nome
        const parenMatch = (screen.name || '').match(/\(([^)]+)\)/)
        const routeFromName = parenMatch ? parenMatch[1] : null
        const screenRoute = screen.route || routeFromName || null
        const cleanName = (screen.name || 'Arquivo').replace(/\s*\([^)]*\)\s*/g, '').trim() || 'Arquivo'

        return {
          name: cleanName,
          description: screen.description || '',
          ...(screenRoute ? { route: screenRoute } : {}),
          blocks: (screen.blocks || []).map((block, idx) => {
            const blockRoute = block.route || screenRoute
            return {
              id: randomUUID(),
              type: (block.type || ContentType.CODE) as ContentType,
              content: block.content || '',
              order: block.order ?? idx,
              title: blockRoute
                ? blockRoute.split('/').pop()?.replace(/\.[^.]+$/, '') ?? blockRoute
                : (block.title || 'Código'),
              ...(block.language ? { language: block.language } : {}),
              ...(blockRoute ? { route: blockRoute } : {}),
            }
          })
        }
      })

      const flowScreen = {
        name: 'Flow',
        description: 'Fluxo de informação entre camadas',
        blocks: [{
          id: randomUUID(),
          type: ContentType.FLOW,
          content: JSON.stringify(flowItems),
          order: 0
        }]
      }

      const screens = [flowScreen, ...codeScreens]

      const cardData: CreateCardFeatureRequest = {
        title: data.title,
        description: data.description || `Flow de ${searchTerm}`,
        tags: data.tags || [searchTerm],
        content_type: ContentType.CODE,
        card_type: CardType.CODIGOS,
        visibility: Visibility.UNLISTED,
        created_in_project_id: id,
        screens
      }

      const createResult = await CardFeatureModel.create(cardData, req.user.id, req.user.role)
      if (!createResult.success || !createResult.data) {
        emit({ type: 'error', message: createResult.error || 'Erro ao criar card' })
        res.end(); return
      }

      await ProjectModel.addCard(id, createResult.data.id, req.user.id)

      // Gerar flow detalhado automaticamente
      emit({ type: 'step', label: 'Gerando flow detalhado com IA...' })

      const allCodeBlocks = codeScreens.flatMap(s =>
        s.blocks.filter(b =>
          b.type === ContentType.CODE ||
          b.type === ContentType.TEXT ||
          b.type === ContentType.TERMINAL
        )
      )

      let finalCard = createResult.data

      if (allCodeBlocks.length > 0) {
        const codeContext = allCodeBlocks.map(b => {
          const header = `[${b.type}] ${b.route || b.title || 'sem rota'}`
          return `${header}\n${b.content}`
        }).join('\n\n---\n\n')

        const flowPrompt = `Você é um especialista em arquitetura de software. Analise os trechos de código abaixo
e gere um fluxo de informação estruturado mostrando como os dados fluem entre as camadas.

Para cada item retorne:
- label: nome da função/endpoint/componente
- layer: frontend | api | backend | database | service
- file: caminho do arquivo (se identificável)
- line: linha(s) (se identificável)
- description: uma linha explicando o que acontece (sempre em português brasileiro)

Escreva todas as descrições em português brasileiro. Retorne apenas JSON válido no formato { "contents": [...] }.

Código para análise:
${codeContext}`

        try {
          const flowAiResponse = await callChatCompletions({
            endpoint: resolveChatCompletionsUrl(),
            apiKey,
            body: { model: 'grok-4-1-fast-reasoning', messages: [{ role: 'user', content: flowPrompt }], temperature: 0.2 }
          })

          emit({ type: 'step', label: 'Interpretando flow detalhado...' })

          const flowRaw = flowAiResponse.content.trim()
          let flowParsed: { contents?: FlowItem[] }
          try {
            flowParsed = JSON.parse(flowRaw) as { contents?: FlowItem[] }
          } catch {
            const cb = flowRaw.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (cb) {
              flowParsed = JSON.parse(cb[1]!.trim()) as { contents?: FlowItem[] }
            } else {
              const f = flowRaw.indexOf('{')
              const l = flowRaw.lastIndexOf('}')
              flowParsed = (f >= 0 && l > f) ? JSON.parse(flowRaw.slice(f, l + 1)) as { contents?: FlowItem[] } : { contents: [] }
            }
          }

          const detailedFlowItems = Array.isArray(flowParsed.contents) ? flowParsed.contents : []

          if (detailedFlowItems.length > 0) {
            const updatedScreens = (createResult.data.screens || []).map(s =>
              s.name === 'Flow'
                ? {
                    ...s,
                    blocks: [{
                      id: randomUUID(),
                      type: ContentType.FLOW,
                      content: JSON.stringify(detailedFlowItems),
                      order: 0
                    }]
                  }
                : s
            )

            const updateResult = await CardFeatureModel.update(
              createResult.data.id,
              { screens: updatedScreens },
              req.user.id,
              req.user.role
            )

            if (updateResult.success && updateResult.data) {
              finalCard = updateResult.data
            }
          }
        } catch (flowError) {
          console.error('[generateFlowCard] Erro ao gerar flow detalhado:', flowError)
          emit({ type: 'step', label: 'Flow detalhado não disponível, usando flow básico.' })
        }
      }

      emit({ type: 'done', card: finalCard })
    } catch (error) {
      emit({ type: 'error', message: error instanceof Error ? error.message : 'Erro interno do servidor' })
    } finally {
      res.end()
    }
  }

}
