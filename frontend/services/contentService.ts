import { apiClient } from './apiClient'

// Enum para tipo de conteúdo
export enum ContentType {
  VIDEO = 'video',
  POST = 'post'
}

export interface Content {
  id: string
  title: string
  description?: string
  youtubeUrl?: string
  videoId?: string
  thumbnail?: string
  category?: string
  tags?: string[]
  selectedCardFeatureId?: string
  contentType: ContentType
  fileUrl?: string
  fileType?: string
  fileSize?: number
  markdownContent?: string
  createdAt: string
  updatedAt: string
}

export interface CreateContentData {
  title: string
  description?: string
  youtubeUrl?: string
  category?: string
  tags?: string[]
  contentType?: ContentType
  fileUrl?: string
  fileType?: string
  fileSize?: number
  markdownContent?: string
}

export interface ContentQueryParams {
  page?: number
  limit?: number
  type?: ContentType
  category?: string
  search?: string
  sortBy?: 'title' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

async function listContents(params: ContentQueryParams = {}) {
  const queryParams = new URLSearchParams()
  
  if (params.page) queryParams.set('page', params.page.toString())
  if (params.limit) queryParams.set('limit', params.limit.toString())
  if (params.type) queryParams.set('type', params.type)
  if (params.category) queryParams.set('category', params.category)
  if (params.search) queryParams.set('search', params.search)
  if (params.sortBy) queryParams.set('sortBy', params.sortBy)
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)

  const queryString = queryParams.toString()
  const url = queryString ? `/contents?${queryString}` : '/contents'
  
  const res = await apiClient.get<Content[]>(url)
  return res
}

async function getContent(id: string) {
  const res = await apiClient.get<Content>(`/contents/${id}`)
  return res
}

async function createContent(data: CreateContentData) {
  const res = await apiClient.post<Content>('/contents', data)
  return res
}

async function updateContent(id: string, data: Partial<CreateContentData>) {
  const res = await apiClient.put<Content>(`/contents/${id}`, data)
  return res
}

async function deleteContent(id: string) {
  const res = await apiClient.delete<{ success: boolean }>(`/contents/${id}`)
  return res
}

async function updateSelectedCardFeature(id: string, cardFeatureId: string | null) {
  const res = await apiClient.patch<Content>(`/contents/${id}/card-feature`, {
    cardFeatureId
  })
  return res
}

export interface UploadResult {
  url: string
  fileName: string
  fileSize: number
  fileType: string
}

async function uploadFile(file: File) {
  const res = await apiClient.uploadFile<UploadResult>('/contents/upload', file, 'file')
  return res
}

async function listPostTags() {
  const res = await apiClient.get<string[]>('/contents/post-tags')
  return res
}

export const contentService = {
  listContents,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  updateSelectedCardFeature,
  uploadFile,
  listPostTags
}
