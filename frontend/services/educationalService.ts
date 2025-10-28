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

export const educationalService = {
  listVideos,
  getVideo,
  createVideo,
  deleteVideo
}

export type { EducationalVideo, CreateEducationalVideoData }


