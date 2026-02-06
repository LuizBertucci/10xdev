// ============================================
// TIPOS PARA A FEATURE GITSYNC
// ============================================
// Gitsync permite sincronização bidirecional entre projetos 10xDev e repositórios GitHub:
// - GitHub → 10xDev: Webhooks atualizam cards quando há pushes
// - 10xDev → GitHub: Edição de cards cria Pull Requests automaticamente

import { Visibility, ApprovalStatus } from '@/types/cardfeature'

// ============================================
// OAUTH TOKENS
// Armazena tokens OAuth de usuários para acessar a API do GitHub em nome deles
// ============================================

export type GitHubOAuthTokenRow = {
  id: string                     // UUID do registro
  user_id: string                // ID do usuário no Supabase Auth
  access_token: string            // Token de acesso OAuth do GitHub
  scope: string | null           // Escopos concedidos (ex: "repo,user:email")
  created_at: string             // Data de criação do token
}

export type GitHubOAuthTokenResponse = {
  id: string
  userId: string
  accessToken: string
  scope: string | null
  createdAt: string
}

// ============================================
// CONEXÕES (REPOSITÓRIOS VINCULADOS)
// Associa um repositório GitHub a um projeto 10xDev
// Um projeto pode ter apenas um repositório vinculado
// ============================================

export type GitHubConnectionRow = {
  id: string                     // UUID da conexão
  project_id: string             // ID do projeto no 10xDev
  user_id: string                // ID do usuário que criou a conexão
  github_owner: string          // Proprietário do repo (username ou org)
  github_repo: string            // Nome do repositório
  github_installation_id: number | null  // ID da instalação do GitHub App
  default_branch: string         // Branch padrão (ex: "main", "master")
  is_active: boolean            // Se a conexão está ativa
  last_sync_at: string | null   // Data do último sync
  created_at: string            // Data de criação da conexão
}

export type GitHubConnectionResponse = {
  id: string
  projectId: string
  userId: string
  githubOwner: string
  githubRepo: string
  fullName: string              // "owner/repo" (ex: "luizbertucci/10xdev")
  defaultBranch: string
  isActive: boolean
  lastSyncAt: string | null
  createdAt: string
}

export type CreateGitHubConnectionRequest = {
  projectId: string
  githubOwner: string
  githubRepo: string
}

export type GitHubConnectionQueryParams = {
  projectId?: string
  active?: boolean
}

// ============================================
// MAPEAMENTOS DE ARQUIVOS
// Associa um card a um arquivo específico no repositório GitHub
// Permite sincronização entre o conteúdo do card e o código no GitHub
// ============================================

export type GitHubFileMappingRow = {
  id: string                     // UUID do mapeamento
  connection_id: string          // ID da conexão (gitsync_connections)
  card_feature_id: string        // ID do card (card_features)
  file_path: string             // Caminho do arquivo no repo (ex: "src/auth.ts")
  branch_name: string           // Branch onde o arquivo está (padrão: "main")
  last_commit_sha: string | null // SHA do último commit que sincronizou
  last_synced_at: string | null  // Data da última sincronização
  card_modified_at: string | null // Data da última modificação do card no 10xDev
  created_at: string            // Data de criação do mapeamento
}

export type GitHubFileMappingResponse = {
  id: string
  connectionId: string
  cardFeatureId: string
  filePath: string
  branchName: string
  lastCommitSha: string | null
  lastSyncedAt: string | null
  cardModifiedAt: string | null
  createdAt: string
}

export type CreateFileMappingRequest = {
  connectionId: string
  cardFeatureId: string
  filePath: string
  branchName?: string
}

export type FileMappingQueryParams = {
  connectionId?: string
  cardFeatureId?: string
}

// ============================================
// PULL REQUESTS
// Armazena Pull Requests criados automaticamente pelo 10xDev
// ============================================

export type GitHubPullRequestRow = {
  id: string                     // UUID do registro
  connection_id: string          // ID da conexão
  card_feature_id: string | null // ID do card relacionado (pode ser nulo)
  pr_number: number             // Número do PR no GitHub
  pr_title: string              // Título do PR
  pr_url: string | null         // URL do PR no GitHub
  pr_state: string | null       // Estado: "open", "closed", "merged"
  source_branch: string          // Branch de origem (feature branch)
  target_branch: string         // Branch de destino (ex: "main")
  created_at: string            // Data de criação
  merged_at: string | null     // Data do merge (se applicable)
}

export type GitHubPullRequestResponse = {
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

export type PullRequestQueryParams = {
  connectionId?: string
  cardFeatureId?: string
  state?: string
}

// ============================================
// LOGS DE SINCRONIZAÇÃO
// Registra todas as operações de sync para debugging e auditoria
// ============================================

export type GitHubSyncLogRow = {
  id: string                     // UUID do log
  connection_id: string         // ID da conexão
  direction: 'inbound' | 'outbound'  // inbound = GitHub→10xDev, outbound = 10xDev→GitHub
  event_type: string | null      // Tipo de evento (push, pull_request, sync, merge, conflict)
  status: string                // "success", "error" ou "conflict"
  error_message: string | null   // Mensagem de erro (se applicable)
  conflict_detected_at: string | null // Data quando um conflito foi detectado
  ai_suggestion: string | null  // Sugestão da IA para resolver o conflito
  resolved: boolean             // Se o conflito foi resolvido
  created_at: string            // Data do evento
}

export type GitHubSyncLogResponse = {
  id: string
  connectionId: string
  direction: 'inbound' | 'outbound'
  eventType: string | null
  status: string
  errorMessage: string | null
  conflictDetectedAt: string | null
  aiSuggestion: string | null
  resolved: boolean
  createdAt: string
}

export type SyncLogQueryParams = {
  connectionId?: string
  direction?: 'inbound' | 'outbound'
  limit?: number
}

// ============================================
// PAYLOADS DE WEBHOOKS
// Formato dos payloads recebidos do GitHub via webhooks
// Documentação: https://docs.github.com/pt/webhooks
// ============================================

// Payload recebido quando há um push no repositório
export type GitHubPushPayload = {
  ref: string                                    // Ref que foi atualizada (ex: "refs/heads/main")
  repository: {
    id: number
    name: string
    full_name: string
    owner: { login: string }
  }
  commits: Array<{
    id: string                      // SHA do commit
    message: string                 // Mensagem do commit
    author: { name: string; email: string }
    timestamp: string               // Data do commit
    added: string[]                 // Arquivos adicionados
    modified: string[]              // Arquivos modificados
    removed: string[]               // Arquivos removidos
  }>
  sender: { login: string; id: number }
}

// Payload recebido quando há atividade em um Pull Request
export type GitHubPullRequestPayload = {
  action: 'opened' | 'closed' | 'reopened' | 'edited' | 'synchronize'
  pull_request: {
    number: number
    title: string
    body: string
    state: 'open' | 'closed'
    merged: boolean
    html_url: string
    head: { ref: string; sha: string }
    base: { ref: string; sha: string }
  }
  repository: {
    id: number
    name: string
    full_name: string
    owner: { login: string }
  }
  sender: { login: string; id: number }
}

// Tipo união para qualquer evento de webhook
export type GitHubWebhookEvent =
  | { type: 'push'; payload: GitHubPushPayload }
  | { type: 'pull_request'; payload: GitHubPullRequestPayload }
  | { type: 'ping'; payload: any }  // Ping inicial do GitHub

// ============================================
// OPERAÇÕES DE SYNC
// Requisições e respostas das operações de sincronização
// ============================================

// Requisição para sincronizar um card para o GitHub
export type SyncToGitHubRequest = {
  cardFeatureId: string          // ID do card a ser sincronizado
  newContent: string             // Novo conteúdo do arquivo
  commitMessage?: string         // Mensagem de commit personalizada
}

// Resposta da operação de sync para GitHub
export type SyncToGitHubResponse = {
  success: boolean
  prUrl: string                 // URL do Pull Request criado
  prNumber: number               // Número do PR
  branchName: string             // Nome da branch criada
  message: string                // Mensagem de status
}

// Resultado do processamento de eventos do GitHub
export type SyncFromGitHubResult = {
  success: boolean
  cardsUpdated: number           // Quantos cards foram atualizados
  commitsProcessed: number       // Quantos commits foram processados
  message: string
}

// ============================================
// TIPOS DE RESPOSTA DA API
// Padrão de resposta usado em todo o backend
// ============================================

export type ModelResult<T> = {
  success: boolean              // Se a operação foi bem-sucedida
  data?: T                     // Dados de resposta (se success)
  error?: string               // Mensagem de erro (se !success)
  statusCode: number           // HTTP status code
}

export type ModelListResult<T> = {
  success: boolean
  data?: T[]                   // Array de resultados
  count?: number               // Total de registros
  error?: string
  statusCode: number
}

// ============================================
// ANÁLISE DE CONFLITOS (AI)
// Usado para detectar e resolver conflitos de sync
// ============================================

export type ConflictAnalysisRequest = {
  cardContent: string           // Conteúdo atual do card (JSON screens)
  githubContent: string         // Conteúdo do arquivo no GitHub
  filePath: string             // Caminho do arquivo
  lastSyncAt: string | null    // Data do último sync
  cardModifiedAt: string | null // Data da última modificação do card
}

export type ConflictAnalysisResponse = {
  hasConflict: boolean          // Se há conflito
  suggestedContent: string | null // Conteúdo sugerido pela IA
  conflictDescription: string  // Descrição do conflito
  manualReviewNeeded: boolean  // Se precisa de revisão manual
  recommendations: string[]    // Recomendações para resolver
}

// ============================================
// TIPOS PARA CONFLITOS DE SINCRONIZAÇÃO
// ============================================

export type SyncConflictLog = {
  id: string
  connectionId: string
  cardFeatureId: string
  filePath: string
  detectedAt: string
  status: 'pending' | 'resolved' | 'skipped'
  aiSuggestion: string | null
  resolvedAt: string | null
  resolvedBy: string | null
}
