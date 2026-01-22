import { apiClient } from './apiClient'

export interface ProjectTemplate {
  id: string
  name: string
  description?: string
  version?: string
  tags?: string[]
  zipPath: string
  zipUrl?: string
  isActive: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTemplateData {
  name: string
  description?: string
  version?: string
  tags?: string[]
  zipPath: string
  zipUrl?: string
  isActive?: boolean
}

export interface UpdateTemplateData {
  name?: string
  description?: string
  version?: string
  tags?: string[]
  zipPath?: string
  zipUrl?: string
  isActive?: boolean
}

export interface TemplateQueryParams {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

async function listTemplates(params: TemplateQueryParams = {}) {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.set('page', params.page.toString())
  if (params.limit) queryParams.set('limit', params.limit.toString())
  if (params.search) queryParams.set('search', params.search)
  if (params.isActive !== undefined) queryParams.set('isActive', params.isActive ? 'true' : 'false')
  if (params.sortBy) queryParams.set('sortBy', params.sortBy)
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)

  const queryString = queryParams.toString()
  const url = queryString ? `/templates?${queryString}` : '/templates'

  return apiClient.get<ProjectTemplate[]>(url)
}

async function getTemplate(id: string) {
  return apiClient.get<ProjectTemplate>(`/templates/${id}`)
}

async function createTemplate(data: CreateTemplateData) {
  return apiClient.post<ProjectTemplate>('/templates', data)
}

async function updateTemplate(id: string, data: UpdateTemplateData) {
  return apiClient.put<ProjectTemplate>(`/templates/${id}`, data)
}

export const templateService = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate
}
