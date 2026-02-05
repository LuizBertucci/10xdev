// ============================================
// MODELS PARA A FEATURE GITSYNC
// ============================================
// Operações de banco de dados para:
// - Tokens OAuth de usuários
// - Conexões entre projetos e repositórios GitHub
// - Mapeamentos de arquivos (card ↔ arquivo)
// - Pull Requests criados
// - Logs de sincronização

import { supabaseAdmin, executeQuery } from '@/database/supabase'
import { randomUUID } from 'crypto'
import type {
  GitHubOAuthTokenRow,
  GitHubConnectionRow,
  GitHubFileMappingRow,
  GitHubPullRequestRow,
  GitHubSyncLogRow,
  GitHubOAuthTokenResponse,
  GitHubConnectionResponse,
  GitHubFileMappingResponse,
  GitHubPullRequestResponse,
  GitHubSyncLogResponse,
  CreateGitHubConnectionRequest,
  CreateFileMappingRequest,
  GitHubConnectionQueryParams,
  FileMappingQueryParams,
  PullRequestQueryParams,
  SyncLogQueryParams,
  ModelResult,
  ModelListResult
} from '@/types/gitsync'

// ============================================
// OAUTH TOKEN MODEL
// Gerencia tokens OAuth armazenados dos usuários
// ============================================

export class GitHubOAuthTokenModel {
  /**
   * Converte uma linha do banco para o formato de resposta da API
   */
  private static transformToResponse(row: GitHubOAuthTokenRow): GitHubOAuthTokenResponse {
    return {
      id: row.id,
      userId: row.user_id,
      accessToken: row.access_token,
      scope: row.scope,
      createdAt: row.created_at
    }
  }

  /**
   * Busca o token mais recente de um usuário
   */
  static async findByUserId(userId: string): Promise<ModelResult<GitHubOAuthTokenResponse | null>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_oauth_tokens')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      )

      if (!data) {
        return { success: true, data: null, statusCode: 200 }
      }

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar token',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Cria um novo token para um usuário
   */
  static async create(userId: string, accessToken: string, scope?: string): Promise<ModelResult<GitHubOAuthTokenResponse>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_oauth_tokens')
          .insert({
            id: randomUUID(),
            user_id: userId,
            access_token: accessToken,
            scope: scope || null,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 201
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao criar token',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Atualiza o token de um usuário (quando faz refresh)
   */
  static async updateToken(userId: string, accessToken: string, scope?: string): Promise<ModelResult<GitHubOAuthTokenResponse>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_oauth_tokens')
          .update({
            access_token: accessToken,
            scope: scope || null
          })
          .eq('user_id', userId)
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao atualizar token',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Cria ou atualiza o token de um usuário (upsert)
   * Usado no callback OAuth para salvar/atualizar o token
   */
  static async upsert(userId: string, accessToken: string, scope?: string): Promise<ModelResult<GitHubOAuthTokenResponse>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_oauth_tokens')
          .upsert({
            id: randomUUID(),
            user_id: userId,
            access_token: accessToken,
            scope: scope || null,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 201
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao salvar token',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Remove o token de um usuário (desconectar GitHub)
   */
  static async deleteByUserId(userId: string): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('gitsync_oauth_tokens')
          .delete()
          .eq('user_id', userId)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao deletar token',
        statusCode: error.statusCode || 500
      }
    }
  }
}

// ============================================
// CONNECTION MODEL
// Gerencia conexões entre projetos 10xDev e repositórios GitHub
// ============================================

export class GitHubConnectionModel {
  /**
   * Converte uma linha do banco para o formato de resposta da API
   */
  private static transformToResponse(row: GitHubConnectionRow): GitHubConnectionResponse {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      githubOwner: row.github_owner,
      githubRepo: row.github_repo,
      fullName: `${row.github_owner}/${row.github_repo}`,
      defaultBranch: row.default_branch,
      isActive: row.is_active,
      lastSyncAt: row.last_sync_at,
      createdAt: row.created_at
    }
  }

  /**
   * Busca uma conexão pelo ID
   */
  static async findById(id: string): Promise<ModelResult<GitHubConnectionResponse | null>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_connections')
          .select('*')
          .eq('id', id)
          .single()
      )

      if (!data) {
        return { success: true, data: null, statusCode: 200 }
      }

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar conexão',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca todas as conexões de um projeto
   */
  static async findByProjectId(projectId: string): Promise<ModelListResult<GitHubConnectionResponse>> {
    try {
      const { data, count } = await executeQuery(
        supabaseAdmin
          .from('gitsync_connections')
          .select('*', { count: 'exact' })
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
      )

      if (!data || data.length === 0) {
        return { success: true, data: [], count: 0, statusCode: 200 }
      }

      return {
        success: true,
        data: data.map((row: GitHubConnectionRow) => this.transformToResponse(row)),
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar conexões',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca uma conexão específica por projeto, owner e repo
   * Usado para verificar se já existe conexão antes de criar
   */
  static async findByProjectAndRepo(
    projectId: string,
    owner: string,
    repo: string
  ): Promise<ModelResult<GitHubConnectionRow | null>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_connections')
          .select('*')
          .eq('project_id', projectId)
          .eq('github_owner', owner)
          .eq('github_repo', repo)
          .single()
      )

      return { success: true, data: data || null, statusCode: 200 }
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null, statusCode: 200 }
      }
      return {
        success: false,
        error: error.message || 'Erro ao buscar conexão',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca uma conexão por owner e repo (para webhooks)
   * O webhook não sabe o projectId, então busca pela combinação owner/repo
   */
  static async findByOwnerAndRepo(
    owner: string,
    repo: string
  ): Promise<ModelResult<GitHubConnectionRow | null>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_connections')
          .select('*')
          .eq('github_owner', owner)
          .eq('github_repo', repo)
          .single()
      )

      return { success: true, data: data || null, statusCode: 200 }
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null, statusCode: 200 }
      }
      return {
        success: false,
        error: error.message || 'Erro ao buscar conexão',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Cria uma nova conexão entre projeto e repositório
   */
  static async create(
    userId: string,
    data: CreateGitHubConnectionRequest
  ): Promise<ModelResult<GitHubConnectionResponse>> {
    try {
      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('gitsync_connections')
          .insert({
            id: randomUUID(),
            project_id: data.projectId,
            user_id: userId,
            github_owner: data.githubOwner,
            github_repo: data.githubRepo,
            is_active: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 201
      }
    } catch (error: any) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Este repositório já está conectado a este projeto',
          statusCode: 409
        }
      }
      return {
        success: false,
        error: error.message || 'Erro ao criar conexão',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Atualiza o ID da instalação do GitHub App
   * Chamado após o usuário instalar o GitHub App no repositório
   */
  static async updateInstallationId(
    id: string,
    installationId: number
  ): Promise<ModelResult<GitHubConnectionResponse>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_connections')
          .update({
            github_installation_id: installationId,
            is_active: true
          })
          .eq('id', id)
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao atualizar instalação',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Atualiza a data do último sync
   * Chamado após processar um webhook de push
   */
  static async updateLastSync(id: string): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('gitsync_connections')
          .update({
            last_sync_at: new Date().toISOString()
          })
          .eq('id', id)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao atualizar last_sync',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Desativa uma conexão (mantém no banco mas não sincroniza mais)
   */
  static async deactivate(id: string): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('gitsync_connections')
          .update({
            is_active: false
          })
          .eq('id', id)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao desativar conexão',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Remove completamente uma conexão
   */
  static async delete(id: string): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('gitsync_connections')
          .delete()
          .eq('id', id)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao deletar conexão',
        statusCode: error.statusCode || 500
      }
    }
  }
}

// ============================================
// FILE MAPPING MODEL
// Gerencia o vínculo entre cards e arquivos no repositório
// ============================================

export class GitHubFileMappingModel {
  /**
   * Converte uma linha do banco para o formato de resposta da API
   */
  private static transformToResponse(row: GitHubFileMappingRow): GitHubFileMappingResponse {
    return {
      id: row.id,
      connectionId: row.connection_id,
      cardFeatureId: row.card_feature_id,
      filePath: row.file_path,
      branchName: row.branch_name,
      lastCommitSha: row.last_commit_sha,
      lastSyncedAt: row.last_synced_at,
      createdAt: row.created_at
    }
  }

  /**
   * Busca um mapeamento pelo ID
   */
  static async findById(id: string): Promise<ModelResult<GitHubFileMappingResponse | null>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_file_mappings')
          .select('*')
          .eq('id', id)
          .single()
      )

      if (!data) {
        return { success: true, data: null, statusCode: 200 }
      }

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar mapeamento',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca todos os mapeamentos de um card
   * Um card pode estar vinculado a múltiplos arquivos
   */
  static async findByCardFeatureId(cardFeatureId: string): Promise<ModelListResult<GitHubFileMappingResponse>> {
    try {
      const { data, count } = await executeQuery(
        supabaseAdmin
          .from('gitsync_file_mappings')
          .select('*', { count: 'exact' })
          .eq('card_feature_id', cardFeatureId)
          .order('created_at', { ascending: false })
      )

      if (!data || data.length === 0) {
        return { success: true, data: [], count: 0, statusCode: 200 }
      }

      return {
        success: true,
        data: data.map((row: GitHubFileMappingRow) => this.transformToResponse(row)),
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar mapeamentos',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca todos os mapeamentos de uma conexão
   */
  static async findByConnectionId(connectionId: string): Promise<ModelListResult<GitHubFileMappingResponse>> {
    try {
      const { data, count } = await executeQuery(
        supabaseAdmin
          .from('gitsync_file_mappings')
          .select('*', { count: 'exact' })
          .eq('connection_id', connectionId)
          .order('created_at', { ascending: false })
      )

      if (!data || data.length === 0) {
        return { success: true, data: [], count: 0, statusCode: 200 }
      }

      return {
        success: true,
        data: data.map((row: GitHubFileMappingRow) => this.transformToResponse(row)),
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar mapeamentos',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca um mapeamento específico por conexão e caminho do arquivo
   * Usado ao processar webhooks para encontrar qual card está associado a um arquivo
   */
  static async findByFilePath(
    connectionId: string,
    filePath: string
  ): Promise<ModelResult<GitHubFileMappingRow | null>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_file_mappings')
          .select('*')
          .eq('connection_id', connectionId)
          .eq('file_path', filePath)
          .single()
      )

      return { success: true, data: data || null, statusCode: 200 }
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null, statusCode: 200 }
      }
      return {
        success: false,
        error: error.message || 'Erro ao buscar mapeamento',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Cria um novo mapeamento entre card e arquivo
   */
  static async create(data: CreateFileMappingRequest): Promise<ModelResult<GitHubFileMappingResponse>> {
    try {
      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('gitsync_file_mappings')
          .insert({
            id: randomUUID(),
            connection_id: data.connectionId,
            card_feature_id: data.cardFeatureId,
            file_path: data.filePath,
            branch_name: data.branchName || 'main',
            created_at: new Date().toISOString()
          })
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 201
      }
    } catch (error: any) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Este arquivo já está mapeado a este card',
          statusCode: 409
        }
      }
      return {
        success: false,
        error: error.message || 'Erro ao criar mapeamento',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Atualiza o SHA do último commit que sincronizou este mapeamento
   */
  static async updateLastSynced(
    id: string,
    commitSha: string
  ): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('gitsync_file_mappings')
          .update({
            last_commit_sha: commitSha,
            last_synced_at: new Date().toISOString()
          })
          .eq('id', id)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao atualizar mapeamento',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Remove um mapeamento
   */
  static async delete(id: string): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('gitsync_file_mappings')
          .delete()
          .eq('id', id)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao deletar mapeamento',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Remove todos os mapeamentos de um card
   * Usado quando um card é deletado
   */
  static async deleteByCardFeatureId(cardFeatureId: string): Promise<ModelResult<{ deleted: number }>> {
    try {
      const { count } = await executeQuery(
        supabaseAdmin
          .from('gitsync_file_mappings')
          .delete({ count: 'exact' })
          .eq('card_feature_id', cardFeatureId)
      )

      return { success: true, data: { deleted: count || 0 }, statusCode: 200 }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao deletar mapeamentos',
        statusCode: error.statusCode || 500
      }
    }
  }
}

// ============================================
// PULL REQUEST MODEL
// Armazena Pull Requests criados automaticamente pelo 10xDev
// ============================================

export class GitHubPullRequestModel {
  /**
   * Converte uma linha do banco para o formato de resposta da API
   */
  private static transformToResponse(row: GitHubPullRequestRow): GitHubPullRequestResponse {
    return {
      id: row.id,
      connectionId: row.connection_id,
      cardFeatureId: row.card_feature_id,
      prNumber: row.pr_number,
      prTitle: row.pr_title,
      prUrl: row.pr_url,
      prState: row.pr_state,
      sourceBranch: row.source_branch,
      targetBranch: row.target_branch,
      createdAt: row.created_at,
      mergedAt: row.merged_at
    }
  }

  /**
   * Busca um PR pelo ID
   */
  static async findById(id: string): Promise<ModelResult<GitHubPullRequestResponse | null>> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('gitsync_pull_requests')
          .select('*')
          .eq('id', id)
          .single()
      )

      if (!data) {
        return { success: true, data: null, statusCode: 200 }
      }

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar PR',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca todos os PRs de uma conexão
   */
  static async findByConnectionId(
    connectionId: string,
    limit: number = 20
  ): Promise<ModelListResult<GitHubPullRequestResponse>> {
    try {
      const { data, count } = await executeQuery(
        supabaseAdmin
          .from('gitsync_pull_requests')
          .select('*', { count: 'exact' })
          .eq('connection_id', connectionId)
          .order('created_at', { ascending: false })
          .limit(limit)
      )

      if (!data || data.length === 0) {
        return { success: true, data: [], count: 0, statusCode: 200 }
      }

      return {
        success: true,
        data: data.map((row: GitHubPullRequestRow) => this.transformToResponse(row)),
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar PRs',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca todos os PRs de um card
   */
  static async findByCardFeatureId(cardFeatureId: string): Promise<ModelListResult<GitHubPullRequestResponse>> {
    try {
      const { data, count } = await executeQuery(
        supabaseAdmin
          .from('gitsync_pull_requests')
          .select('*', { count: 'exact' })
          .eq('card_feature_id', cardFeatureId)
          .order('created_at', { ascending: false })
      )

      if (!data || data.length === 0) {
        return { success: true, data: [], count: 0, statusCode: 200 }
      }

      return {
        success: true,
        data: data.map((row: GitHubPullRequestRow) => this.transformToResponse(row)),
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar PRs',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Registra um novo PR criado pelo 10xDev
   */
  static async create(data: {
    connectionId: string
    cardFeatureId?: string
    prNumber: number
    prTitle: string
    prUrl?: string
    prState?: string
    sourceBranch: string
    targetBranch: string
  }): Promise<ModelResult<GitHubPullRequestResponse>> {
    try {
      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('gitsync_pull_requests')
          .insert({
            id: randomUUID(),
            connection_id: data.connectionId,
            card_feature_id: data.cardFeatureId || null,
            pr_number: data.prNumber,
            pr_title: data.prTitle,
            pr_url: data.prUrl || null,
            pr_state: data.prState || 'open',
            source_branch: data.sourceBranch,
            target_branch: data.targetBranch,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 201
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao criar registro de PR',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Atualiza o estado de um PR (quando é fechado ou mergeado)
   */
  static async updateState(id: string, state: string, mergedAt?: string): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('gitsync_pull_requests')
          .update({
            pr_state: state,
            merged_at: mergedAt || null
          })
          .eq('id', id)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao atualizar PR',
        statusCode: error.statusCode || 500
      }
    }
  }
}

// ============================================
// SYNC LOG MODEL
// Registra todas as operações de sincronização para auditoria
// ============================================

export class GitHubSyncLogModel {
  /**
   * Converte uma linha do banco para o formato de resposta da API
   */
  private static transformToResponse(row: GitHubSyncLogRow): GitHubSyncLogResponse {
    return {
      id: row.id,
      connectionId: row.connection_id,
      direction: row.direction,
      eventType: row.event_type,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: row.created_at
    }
  }

  /**
   * Cria um novo registro de log de sincronização
   */
  static async create(data: {
    connectionId: string
    direction: 'inbound' | 'outbound'
    eventType?: string | null
    status: string
    errorMessage?: string | null
  }): Promise<ModelResult<GitHubSyncLogResponse>> {
    try {
      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('gitsync_sync_logs')
          .insert({
            id: randomUUID(),
            connection_id: data.connectionId,
            direction: data.direction,
            event_type: data.eventType || null,
            status: data.status,
            error_message: data.errorMessage || null,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 201
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao criar log',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca os logs de sincronização de uma conexão
   */
  static async findByConnectionId(
    connectionId: string,
    limit: number = 50
  ): Promise<ModelListResult<GitHubSyncLogResponse>> {
    try {
      const { data, count } = await executeQuery(
        supabaseAdmin
          .from('gitsync_sync_logs')
          .select('*', { count: 'exact' })
          .eq('connection_id', connectionId)
          .order('created_at', { ascending: false })
          .limit(limit)
      )

      if (!data || data.length === 0) {
        return { success: true, data: [], count: 0, statusCode: 200 }
      }

      return {
        success: true,
        data: data.map((row: GitHubSyncLogRow) => this.transformToResponse(row)),
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar logs',
        statusCode: error.statusCode || 500
      }
    }
  }
}
