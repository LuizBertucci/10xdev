// ================================================
// CONTENT/TUTORIAL - Types
// ================================================

// Enum para tipo de conteúdo
export enum TutorialContentType {
  VIDEO = 'video',
  POST = 'post'
}

// Interface principal para Content (Tutorial)
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
  contentType: TutorialContentType
  fileUrl?: string
  fileType?: string
  fileSize?: number
  markdownContent?: string
  createdAt: string
  updatedAt: string
}

// Dados para criar Content
export interface CreateContentData {
  title: string
  description?: string
  youtubeUrl?: string
  category?: string
  tags?: string[]
  contentType?: TutorialContentType
  fileUrl?: string
  fileType?: string
  fileSize?: number
  markdownContent?: string
}

// Dados para atualizar Content
export interface UpdateContentData {
  title?: string
  description?: string
  youtubeUrl?: string
  category?: string
  tags?: string[]
  contentType?: TutorialContentType
  fileUrl?: string
  fileType?: string
  fileSize?: number
  markdownContent?: string
}

// Parâmetros de query para listar Contents
export interface ContentQueryParams {
  page?: number
  limit?: number
  contentType?: TutorialContentType
  category?: string
  search?: string
  sortBy?: 'title' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}
