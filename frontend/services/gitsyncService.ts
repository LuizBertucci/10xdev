// ============================================
// GITSYNC SERVICE (Frontend)
// ============================================
// Serviço de API para a feature gitsync:
// - Conexão OAuth
// - Conexões (projeto ↔ repo)
// - Mapeamento de arquivos
// - Sincronização de cards

import { apiClient, type ApiResponse } from './apiClient'

// ============================================
// TIPOS
// ============================================

export interface GitHubConnection {
  id: string
  projectId: string
  userId: string
  githubOwner: string
  githubRepo: string
  fullName: string
  defaultBranch: string
  isActive: boolean
  lastSyncAt: string | null
  createdAt: string
}

export interface FileMapping {
  id: string
  connectionId: string
  cardFeatureId: string
  filePath: string
  branchName: string
  lastCommitSha: string | null
  lastSyncedAt: string | null
  createdAt: string
}

export interface PullRequest {
  id: string
  connectionId: string
  cardFeatureId: string | null
  prNumber: number
  prTitle: string
  prUrl: string | null
  prState: string | null
  sourceBranch: string
  targetBranch: string
  createdAt: string
  mergedAt: string | null
}

export interface SyncResult {
  success: boolean
  prUrl: string
  prNumber: number
  branchName: string
  message: string
}

// ============================================
// SERVICE CLASS
// ============================================

class GitsyncService {
  private baseUrl = '/api/gitsync'

  /**
   * GET /api/gitsync/oauth/authorize?project_id={id}
   * Gera a URL de autorização OAuth do GitHub
   */
  async getAuthorizationUrl(projectId: string): Promise<{ authUrl: string }> {
    const response = await apiClient.get<{ authUrl: string }>(`${this.baseUrl}/oauth/authorize?project_id=${projectId}`)
    if (!response?.success || !response?.data) {
      throw new Error(response?.error || 'Erro ao gerar URL de autorização')
    }
    return response.data
  }

  /**
   * GET /api/gitsync/connections?project_id={id}
   * Lista as conexões de um projeto
   */
  async getConnections(projectId: string): Promise<GitHubConnection[]> {
    const response = await apiClient.get<GitHubConnection[]>(`${this.baseUrl}/connections?project_id=${projectId}`)
    if (!response?.success || !response?.data) {
      throw new Error(response?.error || 'Erro ao buscar conexões')
    }
    return response.data
  }

  /**
   * POST /api/gitsync/connections
   * Cria uma nova conexão
   */
  async createConnection(data: {
    projectId: string
    githubOwner: string
    githubRepo: string
  }): Promise<GitHubConnection> {
    const response = await apiClient.post<GitHubConnection>(`${this.baseUrl}/connections`, data)
    if (!response?.success || !response?.data) {
      throw new Error(response?.error || 'Erro ao criar conexão')
    }
    return response.data
  }

  /**
   * POST /api/gitsync/card/:cardId/link-file
   * Vincula um arquivo a um card
   */
  async linkFileToCard(cardId: string, data: {
    connectionId: string
    filePath: string
    branchName?: string
  }): Promise<FileMapping> {
    const response = await apiClient.post<FileMapping>(`${this.baseUrl}/card/${cardId}/link-file`, data)
    if (!response?.success || !response?.data) {
      throw new Error(response?.error || 'Erro ao vincular arquivo')
    }
    return response.data
  }

  /**
   * DELETE /api/gitsync/card/:cardId/link-file/:mappingId
   * Remove a vinculação de um arquivo
   */
  async unlinkFileFromCard(cardId: string, mappingId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/card/${cardId}/link-file/${mappingId}`)
  }

  /**
   * GET /api/gitsync/card/:cardId/mappings
   * Lista os arquivos vinculados a um card
   */
  async getCardMappings(cardId: string): Promise<FileMapping[]> {
    const response = await apiClient.get<FileMapping[]>(`${this.baseUrl}/card/${cardId}/mappings`)
    if (!response?.success || !response?.data) {
      throw new Error(response?.error || 'Erro ao buscar mapeamentos')
    }
    return response.data
  }

  /**
   * POST /api/gitsync/card/:cardId/sync-to-github
   * Sincroniza as alterações do card para o GitHub (cria PR)
   */
  async syncCardToGitHub(cardId: string, data: {
    newContent: string
    commitMessage?: string
  }): Promise<SyncResult> {
    const response = await apiClient.post<SyncResult>(`${this.baseUrl}/card/${cardId}/sync-to-github`, data)
    if (!response?.success || !response?.data) {
      throw new Error(response?.error || 'Erro ao sincronizar com GitHub')
    }
    return response.data
  }

  /**
   * GET /api/gitsync/connections/:connectionId/pull-requests
   * Lista os PRs de uma conexão
   */
  async getPullRequests(connectionId: string): Promise<PullRequest[]> {
    const response = await apiClient.get<PullRequest[]>(`${this.baseUrl}/connections/${connectionId}/pull-requests`)
    if (!response?.success || !response?.data) {
      throw new Error(response?.error || 'Erro ao buscar Pull Requests')
    }
    return response.data
  }
}

// Exporta uma instância única do serviço
export const gitsyncService = new GitsyncService()
