// ================================================
// EDUCATIONAL VIDEOS - Types
// ================================================

export interface EducationalVideoRow {
  id: string
  title: string
  description?: string
  youtube_url: string
  video_id: string
  thumbnail: string
  category?: string
  tags?: string[]
  selected_card_feature_id?: string
  created_at: string
  updated_at: string
}

export interface EducationalVideoInsert {
  id?: string
  title: string
  description?: string
  youtube_url: string
  video_id: string
  thumbnail: string
  category?: string
  tags?: string[]
  selected_card_feature_id?: string
  created_at?: string
  updated_at?: string
}

export interface EducationalVideoUpdate {
  title?: string
  description?: string
  youtube_url?: string
  video_id?: string
  thumbnail?: string
  category?: string
  tags?: string[]
  selected_card_feature_id?: string
  updated_at?: string
}

export interface CreateEducationalVideoRequest {
  title: string
  description?: string
  youtubeUrl: string
  category?: string
  tags?: string[]
}

export interface EducationalVideoResponse {
  id: string
  title: string
  description?: string
  youtubeUrl: string
  videoId: string
  thumbnail: string
  category?: string
  tags?: string[]
  selectedCardFeatureId?: string
  createdAt: string
  updatedAt: string
}

export interface ModelResult<T = EducationalVideoResponse> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface ModelListResult<T = EducationalVideoResponse> {
  success: boolean
  data?: T[]
  count?: number
  error?: string
  statusCode?: number
}


