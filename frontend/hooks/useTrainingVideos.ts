import { useState, useEffect, useCallback } from 'react'
import { TrainingVideo, CreateTrainingVideoData, UpdateTrainingVideoData } from '@/types/training'
import { extractYouTubeVideoId, getYouTubeThumbnail, isValidYouTubeUrl } from '@/utils/youtube'

const STORAGE_KEY = 'training_videos'

export function useTrainingVideos() {
  const [videos, setVideos] = useState<TrainingVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null)

  // Load videos from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setVideos(JSON.parse(stored))
      }
    } catch (err) {
      setError('Erro ao carregar vídeos')
    } finally {
      setLoading(false)
    }
  }, [])

  // Save videos to localStorage
  const saveToStorage = useCallback((updatedVideos: TrainingVideo[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVideos))
      setVideos(updatedVideos)
    } catch (err) {
      setError('Erro ao salvar vídeos')
    }
  }, [])

  // Create new video
  const createVideo = useCallback(async (data: CreateTrainingVideoData): Promise<TrainingVideo | null> => {
    try {
      if (!isValidYouTubeUrl(data.youtubeUrl)) {
        setError('URL do YouTube inválida')
        return null
      }

      const videoId = extractYouTubeVideoId(data.youtubeUrl)
      if (!videoId) {
        setError('Não foi possível extrair ID do vídeo')
        return null
      }

      const newVideo: TrainingVideo = {
        id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: data.title,
        description: data.description,
        youtubeUrl: data.youtubeUrl,
        videoId,
        thumbnail: getYouTubeThumbnail(videoId),
        category: data.category,
        tags: data.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const updatedVideos = [newVideo, ...videos]
      saveToStorage(updatedVideos)
      setError(null)
      return newVideo
    } catch (err) {
      setError('Erro ao criar vídeo')
      return null
    }
  }, [videos, saveToStorage])

  // Update video
  const updateVideo = useCallback(async (id: string, data: UpdateTrainingVideoData): Promise<TrainingVideo | null> => {
    try {
      const videoIndex = videos.findIndex(v => v.id === id)
      if (videoIndex === -1) {
        setError('Vídeo não encontrado')
        return null
      }

      let videoId = videos[videoIndex].videoId
      let thumbnail = videos[videoIndex].thumbnail

      // If YouTube URL changed, extract new video ID
      if (data.youtubeUrl && data.youtubeUrl !== videos[videoIndex].youtubeUrl) {
        if (!isValidYouTubeUrl(data.youtubeUrl)) {
          setError('URL do YouTube inválida')
          return null
        }

        const newVideoId = extractYouTubeVideoId(data.youtubeUrl)
        if (!newVideoId) {
          setError('Não foi possível extrair ID do vídeo')
          return null
        }

        videoId = newVideoId
        thumbnail = getYouTubeThumbnail(newVideoId)
      }

      const updatedVideo: TrainingVideo = {
        ...videos[videoIndex],
        ...data,
        videoId,
        thumbnail,
        updatedAt: new Date().toISOString()
      }

      const updatedVideos = [...videos]
      updatedVideos[videoIndex] = updatedVideo
      saveToStorage(updatedVideos)
      setError(null)
      return updatedVideo
    } catch (err) {
      setError('Erro ao atualizar vídeo')
      return null
    }
  }, [videos, saveToStorage])

  // Delete video
  const deleteVideo = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updatedVideos = videos.filter(v => v.id !== id)
      saveToStorage(updatedVideos)
      setError(null)
      return true
    } catch (err) {
      setError('Erro ao deletar vídeo')
      return false
    }
  }, [videos, saveToStorage])

  // Get video by ID
  const getVideoById = useCallback((id: string): TrainingVideo | null => {
    return videos.find(v => v.id === id) || null
  }, [videos])

  // Modal controls
  const startCreating = useCallback(() => {
    setIsCreating(true)
    setEditingVideo(null)
  }, [])

  const cancelCreating = useCallback(() => {
    setIsCreating(false)
  }, [])

  const startEditing = useCallback((video: TrainingVideo) => {
    setEditingVideo(video)
    setIsEditing(true)
  }, [])

  const cancelEditing = useCallback(() => {
    setIsEditing(false)
    setEditingVideo(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    videos,
    loading,
    error,
    isCreating,
    isEditing,
    editingVideo,
    createVideo,
    updateVideo,
    deleteVideo,
    getVideoById,
    startCreating,
    cancelCreating,
    startEditing,
    cancelEditing,
    clearError
  }
}
