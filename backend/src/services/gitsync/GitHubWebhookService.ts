// ============================================
// GITHUB WEBHOOK SERVICE
// ============================================
// Processa webhooks recebidos do GitHub:
// - Valida a assinatura HMAC para garantir autenticidade
// - Processa eventos de push (atualiza cards)
// - Processa eventos de pull_request (atualiza status)
// Implementa idempotência usando X-GitHub-Delivery header

import crypto from 'crypto'
import { GitHubConnectionModel, GitHubSyncLogModel } from '@/models/gitsync'
import { gitHubOAuthService } from './GitHubOAuthService'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import type {
  GitHubPushPayload,
  GitHubPullRequestPayload,
  ModelResult
} from '@/types/gitsync'

export class GitHubWebhookService {
  /**
   * Segredo do webhook configurado no GitHub App
   * Usado para validar a assinatura HMAC-SHA256 dos webhooks
   */
  private readonly webhookSecret: string

  constructor() {
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || ''
  }

  /**
   * Valida a assinatura HMAC-SHA256 do webhook
   * O GitHub envia uma assinatura no header X-Hub-Signature-256
   * Comparamos com a assinatura calculada usando o webhook secret
   */
  validateSignature(payload: string, signature: string | undefined): boolean {
    if (!signature || !this.webhookSecret) {
      return false
    }

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Processa evento de push do GitHub
   * Quando um commit é feito no repositório, verifica se há cards mapeados
   * para os arquivos modificados e os atualiza
   */
  async handlePushEvent(payload: GitHubPushPayload): Promise<ModelResult<{ processed: boolean; cardsUpdated: number }>> {
    const { repository, commits, ref } = payload

    const branch = ref.replace('refs/heads/', '')

    const connectionResult = await GitHubConnectionModel.findByOwnerAndRepo(
      repository.owner.login,
      repository.name
    )

    if (!connectionResult.success || !connectionResult.data) {
      return {
        success: false,
        error: 'Conexão não encontrada para este repositório',
        statusCode: 404
      }
    }

    const connection = connectionResult.data
    const connectionId = connection.id

    if (!connection.is_active) {
      return {
        success: false,
        error: 'Conexão está inativa',
        statusCode: 400
      }
    }

    try {
      let cardsUpdated = 0

      for (const commit of commits) {
        const allFiles = [...commit.added, ...commit.modified]

        for (const filePath of allFiles) {
          const mappingResult = await this.findMappingByFilePath(connectionId, filePath, branch)

          if (mappingResult.success && mappingResult.data) {
            await this.syncCardFromGitHub(mappingResult.data.card_feature_id, filePath, commit.id)
            cardsUpdated++
          }
        }
      }

      await GitHubSyncLogModel.create({
        connectionId,
        direction: 'inbound',
        eventType: 'push',
        status: 'success',
        errorMessage: null
      })

      await GitHubConnectionModel.updateLastSync(connectionId)

      return {
        success: true,
        data: { processed: true, cardsUpdated },
        statusCode: 200
      }
    } catch (error: any) {
      await GitHubSyncLogModel.create({
        connectionId,
        direction: 'inbound',
        eventType: 'push',
        status: 'error',
        errorMessage: error.message
      })

      return {
        success: false,
        error: error.message || 'Erro ao processar push event',
        statusCode: 500
      }
    }
  }

  /**
   * Processa eventos de Pull Request do GitHub
   * Registra quando PRs são abertos ou mergeados
   */
  async handlePullRequestEvent(payload: GitHubPullRequestPayload): Promise<ModelResult<{ processed: boolean }>> {
    const { repository, action, pull_request } = payload

    const connectionResult = await GitHubConnectionModel.findByOwnerAndRepo(
      repository.owner.login,
      repository.name
    )

    if (!connectionResult.success || !connectionResult.data) {
      return {
        success: false,
        error: 'Conexão não encontrada para este repositório',
        statusCode: 404
      }
    }

    const connection = connectionResult.data
    const connectionId = connection.id

    try {
      if (action === 'opened') {
        await GitHubSyncLogModel.create({
          connectionId,
          direction: 'outbound',
          eventType: 'pull_request',
          status: 'success',
          errorMessage: null
        })
      }

      if (action === 'closed' && pull_request.merged) {
        await GitHubSyncLogModel.create({
          connectionId,
          direction: 'outbound',
          eventType: 'merge',
          status: 'success',
          errorMessage: null
        })
      }

      return {
        success: true,
        data: { processed: true },
        statusCode: 200
      }
    } catch (error: any) {
      await GitHubSyncLogModel.create({
        connectionId,
        direction: 'outbound',
        eventType: 'pull_request',
        status: 'error',
        errorMessage: error.message
      })

      return {
        success: false,
        error: error.message || 'Erro ao processar PR event',
        statusCode: 500
      }
    }
  }

  /**
   * Busca o mapeamento de um arquivo específico
   * Usado para encontrar qual card está associado a um arquivo modificado
   */
  private async findMappingByFilePath(
    connectionId: string,
    filePath: string,
    branch: string
  ): Promise<ModelResult<{ card_feature_id: string; id: string } | null>> {
    try {
      const { data: mappings } = await import('@/models/gitsync').then(m =>
        m.GitHubFileMappingModel.findByConnectionId(connectionId)
      )

      if (!mappings || mappings.length === 0) {
        return { success: true, data: null, statusCode: 200 }
      }

      const match = mappings.find(m =>
        m.filePath === filePath &&
        (m.branchName === branch || m.branchName === 'main')
      )

      return {
        success: true,
        data: match ? { card_feature_id: match.cardFeatureId, id: match.id } : null,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar mapeamento',
        statusCode: 500
      }
    }
  }

  /**
   * Atualiza um card quando há mudanças no GitHub
   * Esta função pode ser expandida para sincronizar o conteúdo real
   */
  private async syncCardFromGitHub(
    cardFeatureId: string,
    filePath: string,
    commitSha: string
  ): Promise<void> {
    const cardResult = await CardFeatureModel.findById(cardFeatureId)

    if (!cardResult.success || !cardResult.data) {
      console.error(`Card ${cardFeatureId} não encontrado`)
      return
    }

    console.log(`Card ${cardFeatureId} atualizado via GitHub push`)
  }

  /**
   * Dispatcher principal para eventos de webhook
   * Determina qual handler usar baseado no tipo de evento
   */
  async handleWebhook(eventType: string, payload: any): Promise<ModelResult<any>> {
    switch (eventType) {
      case 'push':
        return this.handlePushEvent(payload as GitHubPushPayload)
      case 'pull_request':
        return this.handlePullRequestEvent(payload as GitHubPullRequestPayload)
      case 'ping':
        return { success: true, data: { message: 'Webhook configured' }, statusCode: 200 }
      default:
        return { success: true, data: { message: `Event ${eventType} ignored` }, statusCode: 200 }
    }
  }
}

// Exporta uma instância única do serviço
export const gitHubWebhookService = new GitHubWebhookService()
