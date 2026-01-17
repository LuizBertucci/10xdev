// ================================================
// CONTENTS - Types
// ================================================

// Enum para tipo de conteúdo
export enum ContentType {
  VIDEO = 'video',
  POST = 'post',
  MANUAL = 'manual',
  TUTORIAL = 'tutorial'
}

export interface ContentRow {
  id: string
  title: string
  description?: string
  youtube_url: string
  video_id: string
  thumbnail: string
  category?: string
  tags?: string[]
  selected_card_feature_id?: string
  content_type: ContentType
  file_url?: string
  file_type?: string
  file_size?: number
  markdown_content?: string
  created_at: string
  updated_at: string
}

export interface ContentInsert {
  id?: string
  title: string
  description?: string
  youtube_url?: string
  video_id?: string
  thumbnail?: string
  category?: string
  tags?: string[]
  selected_card_feature_id?: string
  content_type?: ContentType
  file_url?: string
  file_type?: string
  file_size?: number
  markdown_content?: string
  created_at?: string
  updated_at?: string
}

export interface ContentUpdate {
  title?: string
  description?: string
  youtube_url?: string
  video_id?: string
  thumbnail?: string
  category?: string
  tags?: string[]
  selected_card_feature_id?: string
  content_type?: ContentType
  file_url?: string
  file_type?: string
  file_size?: number
  markdown_content?: string
  updated_at?: string
}

export interface CreateContentRequest {
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

export interface ContentResponse {
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

export interface ContentQueryParams {
  page?: number
  limit?: number
  contentType?: ContentType
  category?: string
  search?: string
  sortBy?: 'title' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface ModelResult<T = ContentResponse> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface ModelListResult<T = ContentResponse> {
  success: boolean
  data?: T[]
  count?: number
  error?: string
  statusCode?: number
}
