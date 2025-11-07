import { apiClient } from './apiClient'

export interface Video {
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

export interface CreateVideoData {
  title: string
  youtubeUrl: string
  description?: string
  category?: string
  tags?: string[]
}

async function listVideos() {
  const res = await apiClient.get<Video[]>('/videos')
  return res
}

async function getVideo(id: string) {
  const res = await apiClient.get<Video>(`/videos/${id}`)
  return res
}

async function createVideo(data: CreateVideoData) {
  const res = await apiClient.post<Video>('/videos', data)
  return res
}

async function updateVideo(id: string, data: Partial<CreateVideoData>) {
  const res = await apiClient.put<Video>(`/videos/${id}`, data)
  return res
}

async function deleteVideo(id: string) {
  const res = await apiClient.delete<{ success: boolean }>(`/videos/${id}`)
  return res
}

async function updateSelectedCardFeature(id: string, cardFeatureId: string | null) {
  const res = await apiClient.patch<Video>(`/videos/${id}/card-feature`, {
    cardFeatureId
  })
  return res
}

export const videoService = {
  listVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  updateSelectedCardFeature
}

