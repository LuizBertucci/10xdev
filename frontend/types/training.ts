// ================================================
// TRAINING VIDEO TYPES
// ================================================

export interface TrainingVideo {
  id: string
  title: string
  description?: string
  youtubeUrl: string
  videoId: string // YouTube video ID extracted from URL
  thumbnail: string
  duration?: string
  category?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateTrainingVideoData {
  title: string
  description?: string
  youtubeUrl: string
  category?: string
  tags?: string[]
}

export interface UpdateTrainingVideoData extends Partial<CreateTrainingVideoData> {}
