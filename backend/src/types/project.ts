// ================================================
// DATABASE TYPES - Supabase/PostgreSQL
// ================================================

export enum ProjectMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

export interface ProjectRow {
  id: string
  name: string
  description: string | null
  repository_url?: string | null
  category_order?: string[] | null
  created_at: string
  updated_at: string
  created_by: string
  // GitSync fields
  github_installation_id?: number | null
  github_owner?: string | null
  github_repo?: string | null
  default_branch?: string | null
  gitsync_active?: boolean
  last_sync_at?: string | null
  last_sync_sha?: string | null
}

export interface ProjectInsert {
  id?: string
  name: string
  description?: string | null
  repository_url?: string | null
  category_order?: string[] | null
  created_at?: string
  updated_at?: string
  created_by: string
}

export interface ProjectUpdate {
  name?: string
  description?: string | null
  category_order?: string[] | null
  updated_at?: string
}

export interface ProjectMemberRow {
  id: string
  project_id: string
  user_id: string
  role: ProjectMemberRole
  created_at: string
  updated_at: string
}

export interface ProjectMemberInsert {
  id?: string
  project_id: string
  user_id: string
  role?: ProjectMemberRole
  created_at?: string
  updated_at?: string
}

export interface ProjectMemberUpdate {
  role?: ProjectMemberRole
  updated_at?: string
}

export interface ProjectCardRow {
  id: string
  project_id: string
  card_feature_id: string
  added_by: string
  created_at: string
  order?: number
}

export interface ProjectCardInsert {
  id?: string
  project_id: string
  card_feature_id: string
  added_by: string
  created_at?: string
  order?: number
}

// ================================================
// API REQUEST/RESPONSE TYPES
// ================================================

export interface CreateProjectRequest {
  name: string
  description?: string
  repositoryUrl?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  categoryOrder?: string[]
}

export interface ProjectResponse {
  id: string
  name: string
  description: string | null
  repositoryUrl?: string | null
  categoryOrder?: string[] | null
  createdAt: string
  updatedAt: string
  createdBy: string
  memberCount?: number
  cardCount?: number
  cardsCreatedCount?: number // Número de cards criados neste projeto (para deleção)
  userRole?: ProjectMemberRole
  // GitSync fields
  githubInstallationId?: number | null
  githubOwner?: string | null
  githubRepo?: string | null
  defaultBranch?: string | null
  gitsyncActive?: boolean
  lastSyncAt?: string | null
  lastSyncSha?: string | null
}

export interface ProjectMemberResponse {
  id: string
  projectId: string
  userId: string
  role: ProjectMemberRole
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
  }
}

export interface ProjectCardResponse {
  id: string
  projectId: string
  cardFeatureId: string
  addedBy: string
  createdAt: string
  order?: number
  cardFeature?: {
    id: string
    title: string
    tech?: string
    language?: string
    description: string
    // Campos opcionais para posts
    category?: string
    fileUrl?: string
    youtubeUrl?: string
    videoId?: string
    thumbnail?: string
  }
}

export interface AddProjectMemberRequest {
  userId: string
  role?: ProjectMemberRole
}

export interface UpdateProjectMemberRequest {
  role: ProjectMemberRole
}

export interface ProjectQueryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface ProjectListResponse {
  data: ProjectResponse[]
  count: number
  totalPages?: number
  currentPage?: number
}

// ================================================
// MODEL OPERATION RESULTS
// ================================================

export interface ModelResult<T = ProjectResponse> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface ModelListResult<T = ProjectResponse> {
  success: boolean
  data?: T[]
  count?: number
  error?: string
  statusCode?: number
}

// ================================================
// GITHUB INTEGRATION TYPES
// ================================================

export interface GithubRepoInfo {
  name: string
  description: string | null
  url: string
  isPrivate: boolean
}

export interface GetGithubInfoRequest {
  url: string
  token?: string
}

export interface ImportFromGithubRequest {
  url: string
  token?: string
  name?: string
  description?: string
  useAi?: boolean
}

export interface ShareProjectRequest {
  userIds?: string[]
  emails?: string[]
}

export interface ImportFromGithubResponse {
  project: ProjectResponse
  jobId: string
}

// ================================================
// GITHUB TOKEN VALIDATION
// ================================================

export interface ValidateGithubTokenRequest {
  token: string
}

export interface ValidateGithubTokenResponse {
  valid: boolean
  message?: string
}

// ================================================
// GITSYNC TYPES
// ================================================

export interface GitSyncProjectFields {
  github_installation_id?: number | null
  github_owner?: string | null
  github_repo?: string | null
  default_branch?: string | null
  gitsync_active?: boolean
  last_sync_at?: string | null
  last_sync_sha?: string | null
}

export interface GitSyncFileMappingRow {
  id: string
  project_id: string
  card_feature_id: string
  file_path: string
  branch_name: string
  last_commit_sha: string | null
  last_synced_at: string | null
  card_modified_at: string | null
  last_pr_number: number | null
  last_pr_url: string | null
  last_pr_state: string | null
  created_at: string
}

export interface GitSyncFileMappingInsert {
  id?: string
  project_id: string
  card_feature_id: string
  file_path: string
  branch_name?: string
  last_commit_sha?: string | null
  last_synced_at?: string | null
  card_modified_at?: string | null
}

export interface GitSyncFileMappingUpdate {
  last_commit_sha?: string | null
  last_synced_at?: string | null
  card_modified_at?: string | null
  last_pr_number?: number | null
  last_pr_url?: string | null
  last_pr_state?: string | null
}

export interface ConnectRepoRequest {
  installationId: number
  owner: string
  repo: string
  defaultBranch?: string
}

export interface SyncStatusResponse {
  active: boolean
  lastSyncAt: string | null
  lastSyncSha: string | null
  githubOwner: string | null
  githubRepo: string | null
  defaultBranch: string | null
  conflicts: number
  totalMappings: number
}

export interface ResolveConflictRequest {
  fileMappingId: string
  resolution: 'keep_card' | 'keep_github'
}

export interface GithubAppRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  language: string | null
  default_branch: string
  html_url: string
  owner: {
    login: string
    avatar_url: string
  }
}

export interface GithubWebhookPushPayload {
  ref: string
  before: string
  after: string
  commits: Array<{
    id: string
    message: string
    added: string[]
    removed: string[]
    modified: string[]
  }>
  repository: {
    name: string
    full_name: string
    owner: {
      login: string
      name: string
    }
  }
  installation?: {
    id: number
  }
}

export interface GithubWebhookInstallationPayload {
  action: 'created' | 'deleted' | 'suspend' | 'unsuspend'
  installation: {
    id: number
    account: {
      login: string
    }
  }
  repositories?: Array<{
    id: number
    name: string
    full_name: string
  }>
}
