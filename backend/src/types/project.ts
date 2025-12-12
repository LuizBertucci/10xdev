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
  repository_url: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export interface ProjectInsert {
  id?: string
  name: string
  description?: string | null
  repository_url?: string | null
  created_at?: string
  updated_at?: string
  created_by: string
}

export interface ProjectUpdate {
  name?: string
  description?: string | null
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
}

export interface ProjectResponse {
  id: string
  name: string
  description: string | null
  repositoryUrl: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
  memberCount?: number
  cardCount?: number
  userRole?: ProjectMemberRole
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
    tech: string
    language: string
    description: string
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

export interface GithubFileInfo {
  path: string
  name: string
  type: 'file' | 'dir'
  size?: number
  content?: string
  encoding?: string
}

export interface GithubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

export interface ImportFromGithubRequest {
  url: string
  token?: string
  name?: string
  description?: string
}

export interface ImportFromGithubResponse {
  project: ProjectResponse
  cardsCreated: number
  filesProcessed: number
}

