import { apiClient } from './apiClient'

export interface EducationalVideo {
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

export interface CreateEducationalVideoData {
  title: string
  youtubeUrl: string
  description?: string
  category?: string
  tags?: string[]
}

async function listVideos() {
  const res = await apiClient.get<EducationalVideo[]>('/educational/videos')
  return res
}

async function getVideo(id: string) {
  const res = await apiClient.get<EducationalVideo>(`/educational/videos/${id}`)
  return res
}

async function createVideo(data: CreateEducationalVideoData) {
  const res = await apiClient.post<EducationalVideo>('/educational/videos', data)
  return res
}

async function deleteVideo(id: string) {
  const res = await apiClient.delete<{ success: boolean }>(`/educational/videos/${id}`)
  return res
}

async function updateSelectedCardFeature(id: string, cardFeatureId: string | null) {
  const res = await apiClient.patch<EducationalVideo>(`/educational/videos/${id}/card-feature`, {
    cardFeatureId
  })
  return res
}

export const educationalService = {
  listVideos,
  getVideo,
  createVideo,
  deleteVideo,
  updateSelectedCardFeature
}

export type { EducationalVideo, CreateEducationalVideoData }


