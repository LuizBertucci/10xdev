// ============================================
// GITHUB SYNC CONTROLLER
// ============================================
// Controlador REST para a API do gitsync:
// - OAuth flow (authorize, callback, disconnect)
// - Gerenciamento de conexões (CRUD)
// - Vinculação de arquivos a cards
// - Sincronização de cards para GitHub (cria PR)
// - Webhooks do GitHub
// Documentação da API: https://docs.github.com/pt/rest

import { Request, Response } from 'express'
import { gitHubOAuthService } from '@/services/gitsync/GitHubOAuthService'
import { gitHubWebhookService } from '@/services/gitsync/GitHubWebhookService'
import { GitHubConnectionModel, GitHubFileMappingModel, GitHubPullRequestModel, GitHubSyncLogModel } from '@/models/gitsync'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import type { ModelResult } from '@/types/gitsync'

export class GitHubSyncController {
  // ============================================
  // OAUTH ENDPOINTS
  // Fluxo de autorização OAuth com o GitHub
  // ============================================

  /**
   * GET /api/gitsync/oauth/authorize
   * Gera a URL de autorização OAuth do GitHub
   * Recebe project_id como query parameter
   * Retorna { authUrl: string }
   */
  async getAuthorizationUrl(req: Request, res: Response): Promise<void> {
    try {
      const { project_id } = req.query

      if (!project_id || typeof project_id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'project_id é obrigatório',
          statusCode: 400
        })
        return
      }

      const state = Buffer.from(JSON.stringify({ projectId: project_id })).toString('base64')
      const authUrl = gitHubOAuthService.getAuthorizationUrl(state)

      res.status(200).json({
        success: true,
        data: { authUrl },
        statusCode: 200
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao gerar URL de autorização',
        statusCode: 500
      })
    }
  }

  /**
   * GET /api/gitsync/oauth/callback
   * Callback do GitHub após autorização
   * Recebe code e state como query parameters
   * Salva token e redireciona para a página do projeto
   */
  async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query

      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Código OAuth é obrigatório',
          statusCode: 400
        })
        return
      }

      if (!state || typeof state !== 'string') {
        res.status(400).json({
          success: false,
          error: 'State é obrigatório',
          statusCode: 400
        })
        return
      }

      let stateData: { projectId: string }
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'))
      } catch {
        res.status(400).json({
          success: false,
          error: 'State inválido',
          statusCode: 400
        })
        return
      }

      const tokenResult = await gitHubOAuthService.exchangeCodeForToken(code)

      if (!tokenResult.success || !tokenResult.data) {
        res.status(400).json({
          success: false,
          error: tokenResult.error || 'Erro ao trocar código por token',
          statusCode: 400
        })
        return
      }

      const userId = (req as any).user?.id || 'demo-user'

      await gitHubOAuthService.saveToken(userId, tokenResult.data.accessToken, tokenResult.data.scope)

      res.redirect(`/projects/${stateData.projectId}?gitsync=connected`)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro no callback OAuth',
        statusCode: 500
      })
    }
  }

  /**
   * POST /api/gitsync/oauth/disconnect
   * Desconecta a conta GitHub do usuário
   * Remove o token OAuth do banco
   */
  async disconnect(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'demo-user'

      await gitHubOAuthService.deleteToken(userId)

      res.status(200).json({
        success: true,
        data: { message: 'Desconectado com sucesso' },
        statusCode: 200
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao desconectar',
        statusCode: 500
      })
    }
  }

  // ============================================
  // CONNECTION ENDPOINTS
  // Gerenciamento de conexões entre projetos e repositórios
  // ============================================

  /**
   * GET /api/gitsync/connections
   * Lista todas as conexões de um projeto
   * Recebe project_id como query parameter
   */
  async getConnections(req: Request, res: Response): Promise<void> {
    try {
      const { project_id } = req.query

      if (!project_id || typeof project_id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'project_id é obrigatório',
          statusCode: 400
        })
        return
      }

      const result = await GitHubConnectionModel.findByProjectId(project_id)

      res.status(result.statusCode).json(result)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar conexões',
        statusCode: 500
      })
    }
  }

  /**
   * POST /api/gitsync/connections
   * Cria uma nova conexão entre projeto e repositório
   * Recebe { projectId, githubOwner, githubRepo } no body
   */
  async createConnection(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'demo-user'
      const { projectId, githubOwner, githubRepo } = req.body

      if (!projectId || !githubOwner || !githubRepo) {
        res.status(400).json({
          success: false,
          error: 'projectId, githubOwner e githubRepo são obrigatórios',
          statusCode: 400
        })
        return
      }

      const result = await GitHubConnectionModel.create(userId, {
        projectId,
        githubOwner,
        githubRepo
      })

      res.status(result.statusCode).json(result)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao criar conexão',
        statusCode: 500
      })
    }
  }

  /**
   * DELETE /api/gitsync/connections/:id
   * Remove uma conexão
   */
  async deleteConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID da conexão é obrigatório',
          statusCode: 400
        })
        return
      }

      const result = await GitHubConnectionModel.delete(id)

      res.status(result.statusCode).json(result)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao deletar conexão',
        statusCode: 500
      })
    }
  }

  // ============================================
  // REPO ENDPOINTS
  // Listagem de repositórios do usuário
  // ============================================

  /**
   * GET /api/gitsync/repos
   * Lista os repositórios do usuário autenticado
   * Usa o token OAuth para acessar a API do GitHub
   */
  async getUserRepos(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'demo-user'

      const result = await gitHubOAuthService.getUserRepos(userId)

      res.status(result.statusCode).json(result)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar repositórios',
        statusCode: 500
      })
    }
  }

  // ============================================
  // FILE MAPPING ENDPOINTS
  // Vinculação de arquivos a cards
  // ============================================

  /**
   * POST /api/gitsync/card/:cardId/link-file
   * Vincula um arquivo do repositório a um card
   * Recebe { connectionId, filePath, branchName } no body
   */
  async linkFileToCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params
      const { connectionId, filePath, branchName } = req.body

      if (!cardId || !connectionId || !filePath) {
        res.status(400).json({
          success: false,
          error: 'cardId, connectionId e filePath são obrigatórios',
          statusCode: 400
        })
        return
      }

      const result = await GitHubFileMappingModel.create({
        connectionId,
        cardFeatureId: cardId,
        filePath,
        branchName
      })

      res.status(result.statusCode).json(result)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao vincular arquivo ao card',
        statusCode: 500
      })
    }
  }

  /**
   * DELETE /api/gitsync/card/:cardId/link-file/:mappingId
   * Remove a vinculação de um arquivo a um card
   */
  async unlinkFileFromCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardId, mappingId } = req.params

      if (!cardId || !mappingId) {
        res.status(400).json({
          success: false,
          error: 'cardId e mappingId são obrigatórios',
          statusCode: 400
        })
        return
      }

      const result = await GitHubFileMappingModel.delete(mappingId)

      res.status(result.statusCode).json(result)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao desvincular arquivo',
        statusCode: 500
      })
    }
  }

  /**
   * GET /api/gitsync/card/:cardId/mappings
   * Lista todos os arquivos vinculados a um card
   */
  async getCardMappings(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params

      if (!cardId) {
        res.status(400).json({
          success: false,
          error: 'cardId é obrigatório',
          statusCode: 400
        })
        return
      }

      const result = await GitHubFileMappingModel.findByCardFeatureId(cardId)

      res.status(result.statusCode).json(result)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar mapeamentos',
        statusCode: 500
      })
    }
  }

  // ============================================
  // SYNC ENDPOINT (Card → GitHub)
  // Cria um Pull Request com as alterações do card
  // ============================================

  /**
   * POST /api/gitsync/card/:cardId/sync-to-github
   * Sincroniza as alterações de um card para o GitHub
   * Cria uma nova branch, commita as alterações e cria um PR
   * Recebe { newContent, commitMessage } no body
   */
  async syncCardToGitHub(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'demo-user'
      const { cardId } = req.params
      const { newContent, commitMessage } = req.body

      if (!cardId) {
        res.status(400).json({
          success: false,
          error: 'cardId é obrigatório',
          statusCode: 400
        })
        return
      }

      const cardResult = await CardFeatureModel.findById(cardId)

      if (!cardResult.success || !cardResult.data) {
        res.status(404).json({
          success: false,
          error: 'Card não encontrado',
          statusCode: 404
        })
        return
      }

      const cardData = cardResult.data
      const mappingResult = await GitHubFileMappingModel.findByCardFeatureId(cardId)

      if (!mappingResult.success || !mappingResult.data || mappingResult.data.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Card não está vinculado a nenhum arquivo. Vincule um arquivo primeiro.',
          statusCode: 400
        })
        return
      }

      const mapping = mappingResult.data[0]!
      const connectionResult = await GitHubConnectionModel.findById(mapping.connectionId)

      if (!connectionResult.success || !connectionResult.data) {
        res.status(404).json({
          success: false,
          error: 'Conexão não encontrada',
          statusCode: 404
        })
        return
      }

      const connection = connectionResult.data
      const timestamp = Date.now()
      const branchName = `feature/10xdev-${cardId.slice(0, 8)}-${timestamp}`

      const createBranchResult = await gitHubOAuthService.createBranch(
        userId,
        connection.githubOwner,
        connection.githubRepo,
        branchName,
        connection.defaultBranch
      )

      if (!createBranchResult.success) {
        res.status(500).json({
          success: false,
          error: createBranchResult.error || 'Erro ao criar branch',
          statusCode: 500
        })
        return
      }

      const fileContentResult = await gitHubOAuthService.getFileContent(
        userId,
        connection.githubOwner,
        connection.githubRepo,
        mapping.filePath,
        mapping.branchName
      )

      const sha = fileContentResult.data?.sha

      const commitMsg = commitMessage || `[10xDev] Atualiza ${cardData.title}`

      const updateResult = await gitHubOAuthService.createOrUpdateFile(
        userId,
        connection.githubOwner,
        connection.githubRepo,
        mapping.filePath,
        newContent,
        commitMsg,
        branchName,
        sha || undefined
      )

      if (!updateResult.success) {
        res.status(500).json({
          success: false,
          error: updateResult.error || 'Erro ao commitar alterações',
          statusCode: 500
        })
        return
      }

      const prTitle = `[10xDev] ${cardData.title}`
      const prBody = `Atualização automática do card "${cardData.title}" editada na 10xDev.\n\n💡 Este PR foi criado automaticamente pela plataforma 10xDev.`

      const prResult = await gitHubOAuthService.createPullRequest(
        userId,
        connection.githubOwner,
        connection.githubRepo,
        prTitle,
        prBody,
        branchName,
        connection.defaultBranch
      )

      if (!prResult.success) {
        res.status(500).json({
          success: false,
          error: prResult.error || 'Erro ao criar Pull Request',
          statusCode: 500
        })
        return
      }

      const prData = prResult.data!
      const updateData = updateResult.data!

      await GitHubPullRequestModel.create({
        connectionId: connection.id,
        cardFeatureId: cardId,
        prNumber: prData.number,
        prTitle: prTitle,
        prUrl: prData.url,
        prState: 'open',
        sourceBranch: branchName,
        targetBranch: connection.defaultBranch
      })

      await GitHubFileMappingModel.updateLastSynced(mapping.id, updateData.commitSha)

      await GitHubSyncLogModel.create({
        connectionId: connection.id,
        direction: 'outbound',
        eventType: 'sync',
        status: 'success'
      })

      res.status(200).json({
        success: true,
        data: {
          prUrl: prData.url,
          prNumber: prData.number,
          branchName: branchName,
          message: 'Pull Request criado com sucesso!'
        },
        statusCode: 200
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao sincronizar card com GitHub',
        statusCode: 500
      })
    }
  }

  // ============================================
  // PULL REQUEST ENDPOINTS
  // Listagem de Pull Requests criados
  // ============================================

  /**
   * GET /api/gitsync/connections/:connectionId/pull-requests
   * Lista todos os PRs criados pelo 10xDev para uma conexão
   */
  async getPullRequests(req: Request, res: Response): Promise<void> {
    try {
      const { connectionId } = req.params

      if (!connectionId) {
        res.status(400).json({
          success: false,
          error: 'connectionId é obrigatório',
          statusCode: 400
        })
        return
      }

      const result = await GitHubPullRequestModel.findByConnectionId(connectionId)

      res.status(result.statusCode).json(result)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar Pull Requests',
        statusCode: 500
      })
    }
  }

  // ============================================
  // SYNC LOG ENDPOINTS
  // Listagem de logs de sincronização
  // ============================================

  /**
   * GET /api/gitsync/connections/:connectionId/sync-logs
   * Lista os logs de sincronização de uma conexão
   */
  async getSyncLogs(req: Request, res: Response): Promise<void> {
    try {
      const { connectionId } = req.params

      if (!connectionId) {
        res.status(400).json({
          success: false,
          error: 'connectionId é obrigatório',
          statusCode: 400
        })
        return
      }

      const result = await GitHubSyncLogModel.findByConnectionId(connectionId)

      res.status(result.statusCode).json(result)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar logs de sync',
        statusCode: 500
      })
    }
  }

  // ============================================
  // WEBHOOK ENDPOINT
  // Recebe eventos do GitHub
  // ============================================

  /**
   * POST /api/gitsync/webhooks/github
   * Endpoint para receber webhooks do GitHub
   * Valida assinatura HMAC e despacha para o handler apropriado
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined
      const eventType = req.headers['x-github-event'] as string
      const deliveryId = req.headers['x-github-delivery'] as string

      const payload = JSON.stringify(req.body)

      const isValid = gitHubWebhookService.validateSignature(payload, signature)

      if (!isValid && process.env.NODE_ENV === 'production') {
        res.status(401).json({
          success: false,
          error: 'Assinatura do webhook inválida',
          statusCode: 401
        })
        return
      }

      const result = await gitHubWebhookService.handleWebhook(eventType, req.body)

      res.status(result.statusCode).json(result)
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar webhook',
        statusCode: 500
      })
    }
  }
}

// Exporta uma instância única do controlador
export const gitHubSyncController = new GitHubSyncController()
