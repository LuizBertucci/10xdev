// ================================================
// CONTENT TYPES
// ================================================

export enum ContentType {
  VIDEO = 'video',
  POST = 'post'
}

export interface TrainingContent {
  id: string
  title: string
  description?: string
  youtubeUrl?: string
  videoId?: string // YouTube video ID extracted from URL
  thumbnail?: string
  duration?: string
  category?: string
  tags?: string[]
  contentType: ContentType
  fileUrl?: string
  fileType?: string
  fileSize?: number
  markdownContent?: string
  createdAt: string
  updatedAt: string
}

// Alias para compatibilidade
export type TrainingVideo = TrainingContent

export interface CreateTrainingContentData {
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

// Alias para compatibilidade
export type CreateTrainingVideoData = CreateTrainingContentData

export type UpdateTrainingContentData = Partial<CreateTrainingContentData>
