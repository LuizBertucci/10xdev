import { apiClient, ApiResponse } from './apiClient'

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
  repositoryUrl: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
  memberCount?: number
  cardCount?: number
  userRole?: ProjectMemberRole
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
  cardFeature?: {
    id: string
    title: string
    tech: string
    language: string
    description: string
  }
}

interface CreateProjectData {
  name: string
  description?: string
  repositoryUrl?: string
}

interface UpdateProjectData {
  name?: string
  description?: string
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

interface GithubRepoInfo {
  name: string
  description: string | null
  url: string
  isPrivate: boolean
}

interface GetGithubInfoData {
  url: string
  token?: string
}

// ================================================
// SERVICE
// ================================================

class ProjectService {
  private readonly endpoint = '/projects'

  // ================================================
  // GITHUB INTEGRATION
  // ================================================

  async getGithubInfo(data: GetGithubInfoData): Promise<ApiResponse<GithubRepoInfo> | undefined> {
    return apiClient.post<GithubRepoInfo>(`${this.endpoint}/github-info`, data)
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
    return apiClient.get<Project[]>(this.endpoint, params)
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

  async delete(id: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.delete<null>(`${this.endpoint}/${id}`)
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

  async updateMember(projectId: string, userId: string, data: UpdateProjectMemberData): Promise<ApiResponse<ProjectMember> | undefined> {
    return apiClient.put<ProjectMember>(`${this.endpoint}/${projectId}/members/${userId}`, data)
  }

  async removeMember(projectId: string, userId: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.delete<null>(`${this.endpoint}/${projectId}/members/${userId}`)
  }

  // ================================================
  // CARDS
  // ================================================

  async getCards(projectId: string): Promise<ApiResponse<ProjectCard[]> | undefined> {
    return apiClient.get<ProjectCard[]>(`${this.endpoint}/${projectId}/cards`)
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
  GithubRepoInfo,
  GetGithubInfoData
}

