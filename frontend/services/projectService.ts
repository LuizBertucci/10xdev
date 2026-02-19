import { apiClient, ApiResponse } from './apiClient'
import type { CardFeature } from '@/types'

// ================================================
// TYPES
// ================================================

export enum ProjectMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

interface Project {
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

export interface GithubRepoInfo {
  name: string
  description: string | null
  url: string
  isPrivate: boolean
}

export interface ValidateGithubTokenResponse {
  valid: boolean
  message?: string
}

interface ProjectMember {
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

interface ProjectCard {
  id: string
  projectId: string
  cardFeatureId: string
  addedBy: string
  createdAt: string
  order?: number
  cardFeature?: CardFeature
}

interface CreateProjectData {
  name: string
  description?: string
  repositoryUrl?: string
}

interface UpdateProjectData {
  name?: string
  description?: string
  categoryOrder?: string[]
}

interface AddProjectMemberData {
  userId: string
  role?: ProjectMemberRole
}

interface UpdateProjectMemberData {
  role: ProjectMemberRole
}

interface ProjectQueryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

// GitSync types
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

export interface ConnectRepoData {
  installationId: number
  owner: string
  repo: string
  defaultBranch?: string
}

// ================================================
// SERVICE
// ================================================

class ProjectService {
  private readonly endpoint = '/projects'

  // ================================================
  // GITHUB INTEGRATION
  // ================================================

  async validateGithubToken(token: string): Promise<ApiResponse<ValidateGithubTokenResponse> | undefined> {
    return apiClient.post<ValidateGithubTokenResponse>(`${this.endpoint}/validate-token`, { token })
  }

  async getGithubInfo(data: { url: string; token?: string }, silent = false): Promise<ApiResponse<GithubRepoInfo> | undefined> {
    return apiClient.post<GithubRepoInfo>(`${this.endpoint}/github-info`, data, silent)
  }

  async importFromGithub(data: {
    url: string
    token?: string
    name?: string
    description?: string
    useAi?: boolean
    installationId?: number
  }): Promise<ApiResponse<{ project: Project; jobId: string }> | undefined> {
    return apiClient.post<{ project: Project; jobId: string }>(`${this.endpoint}/import-from-github`, data)
  }

  // ================================================
  // CREATE
  // ================================================

  async create(data: CreateProjectData): Promise<ApiResponse<Project> | undefined> {
    return apiClient.post<Project>(this.endpoint, data)
  }

  // ================================================
  // READ
  // ================================================

  async getAll(params?: ProjectQueryParams): Promise<ApiResponse<Project[]> | undefined> {
    return apiClient.get<Project[]>(this.endpoint, params as unknown as Record<string, string | number | undefined>)
  }

  async getById(id: string): Promise<ApiResponse<Project> | undefined> {
    return apiClient.get<Project>(`${this.endpoint}/${id}`)
  }

  // ================================================
  // UPDATE
  // ================================================

  async update(id: string, data: UpdateProjectData): Promise<ApiResponse<Project> | undefined> {
    return apiClient.put<Project>(`${this.endpoint}/${id}`, data)
  }

  // ================================================
  // DELETE
  // ================================================

  async delete(id: string, options?: { deleteCards?: boolean }): Promise<ApiResponse<{ cardsDeleted: number }> | undefined> {
    const queryParams = options?.deleteCards ? '?deleteCards=true' : ''
    return apiClient.delete<{ cardsDeleted: number }>(`${this.endpoint}/${id}${queryParams}`)
  }

  // ================================================
  // MEMBERS
  // ================================================

  async getMembers(projectId: string): Promise<ApiResponse<ProjectMember[]> | undefined> {
    return apiClient.get<ProjectMember[]>(`${this.endpoint}/${projectId}/members`)
  }

  async addMember(projectId: string, data: AddProjectMemberData): Promise<ApiResponse<ProjectMember> | undefined> {
    return apiClient.post<ProjectMember>(`${this.endpoint}/${projectId}/members`, data)
  }

  async shareProject(
    projectId: string,
    data: { userIds?: string[]; emails?: string[] }
  ): Promise<ApiResponse<{ addedIds: string[]; ignored: Array<{ userIdOrEmail: string; reason: string }>; failed: Array<{ userIdOrEmail: string; error: string }> }> | undefined> {
    return apiClient.post(`${this.endpoint}/${projectId}/share`, data)
  }

  async updateMember(projectId: string, userId: string, data: UpdateProjectMemberData): Promise<ApiResponse<ProjectMember> | undefined> {
    return apiClient.put<ProjectMember>(`${this.endpoint}/${projectId}/members/${userId}`, data)
  }

  async removeMember(projectId: string, userId: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.delete<null>(`${this.endpoint}/${projectId}/members/${userId}`)
  }

  // ================================================
  // CARDS
  // ================================================

  async getCards(projectId: string, limit?: number, offset?: number): Promise<ApiResponse<ProjectCard[]> | undefined> {
    // Sem paginação: busca todos via /cards/all
    if (limit === undefined && offset === undefined) {
      return apiClient.get<ProjectCard[]>(`${this.endpoint}/${projectId}/cards/all`)
    }
    const params: Record<string, string | number> = {}
    if (limit !== undefined) params.limit = limit
    if (offset !== undefined) params.offset = offset
    return apiClient.get<ProjectCard[]>(`${this.endpoint}/${projectId}/cards`, params)
  }

  async addCard(projectId: string, cardFeatureId: string): Promise<ApiResponse<ProjectCard> | undefined> {
    return apiClient.post<ProjectCard>(`${this.endpoint}/${projectId}/cards`, { cardFeatureId })
  }

  async removeCard(projectId: string, cardFeatureId: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.delete<null>(`${this.endpoint}/${projectId}/cards/${cardFeatureId}`)
  }

  async reorderCard(projectId: string, cardFeatureId: string, direction: 'up' | 'down'): Promise<ApiResponse<null> | undefined> {
    return apiClient.patch<null>(`${this.endpoint}/${projectId}/cards/${cardFeatureId}/reorder`, { direction })
  }

  // ================================================
  // GITSYNC
  // ================================================

  /** Lista repos acessiveis pela GitHub App installation */
  async listGithubRepos(installationId: number): Promise<ApiResponse<GithubAppRepo[]> | undefined> {
    return apiClient.get<GithubAppRepo[]>(`${this.endpoint}/gitsync/repos`, { installation_id: installationId })
  }

  /** Conecta um projeto a um repo GitHub */
  async connectRepo(projectId: string, data: ConnectRepoData): Promise<ApiResponse<Project> | undefined> {
    // Conexao inicial pode levar mais tempo por processamento AI/import
    return apiClient.postWithTimeout<Project>(
      `${this.endpoint}/${projectId}/gitsync/connect`,
      data,
      120000
    )
  }

  /** Desconecta o projeto do GitHub */
  async disconnectRepo(projectId: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.delete<null>(`${this.endpoint}/${projectId}/gitsync/connect`)
  }

  /** Obtem status de sync do projeto */
  async getSyncStatus(projectId: string): Promise<ApiResponse<SyncStatusResponse> | undefined> {
    return apiClient.get<SyncStatusResponse>(`${this.endpoint}/${projectId}/gitsync/status`)
  }

  /** Trigger manual de sync GitHub -> Cards */
  async syncProject(projectId: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.post<null>(`${this.endpoint}/${projectId}/gitsync/sync`, {})
  }

  /** Envia mudancas de um card para o GitHub como PR */
  async pushToGithub(projectId: string, cardFeatureId: string): Promise<ApiResponse<{ prUrl: string; prNumber: number }> | undefined> {
    return apiClient.post<{ prUrl: string; prNumber: number }>(`${this.endpoint}/${projectId}/gitsync/push`, { cardFeatureId })
  }

  /** Resolve conflito de sync */
  async resolveConflict(projectId: string, fileMappingId: string, resolution: 'keep_card' | 'keep_github'): Promise<ApiResponse<Record<string, unknown>> | undefined> {
    return apiClient.post<Record<string, unknown>>(`${this.endpoint}/${projectId}/gitsync/resolve`, { fileMappingId, resolution })
  }
}

// Instância singleton
export const projectService = new ProjectService()

// Export dos tipos para uso externo
export type {
  Project,
  ProjectMember,
  ProjectCard,
  CreateProjectData,
  UpdateProjectData,
  AddProjectMemberData,
  UpdateProjectMemberData,
  ProjectQueryParams,
  ConnectRepoData,
  SyncStatusResponse,
  GithubAppRepo
}

