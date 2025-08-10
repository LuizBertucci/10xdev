import { useState, useCallback } from 'react'
import { youtubeService, type YouTubePlaylist, type YouTubeVideo } from '@/services/youtubeService'

export interface VideoLesson {
  id: string
  title: string
  description: string
  duration: string
  chapter: number
  completed: boolean
  track: string
}

export interface PlaylistSeries {
  id: string
  title: string
  description: string
  thumbnail: string
  totalVideos: number
  duration: string
  completed: number
  youtubePlaylistId: string
  difficulty: "Iniciante" | "Intermediário" | "Avançado"
}

export interface IndividualTraining {
  id: string
  title: string
  description: string
  thumbnail: string
  duration: string
  youtubeId: string
  tags: string[]
  difficulty: "Iniciante" | "Intermediário" | "Avançado"
  originalUrl?: string // Para guardar a URL original com playlist se existir
}

interface LessonsState {
  playlistSeries: PlaylistSeries[]
  individualTrainings: IndividualTraining[]
  loading: boolean
  loadingPlaylist: boolean
  loadingVideo: boolean
  error: string | null
}

export function useLessons() {
  const [state, setState] = useState<LessonsState>({
    playlistSeries: [],
    individualTrainings: [],
    loading: false,
    loadingPlaylist: false,
    loadingVideo: false,
    error: null
  })

  // Função auxiliar para extrair ID do YouTube de uma URL
  const extractYouTubeId = useCallback((url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    
    return null
  }, [])

  // Função auxiliar para extrair ID da playlist do YouTube
  const extractPlaylistId = useCallback((url: string): string | null => {
    const patterns = [
      /[?&]list=([^&\n?#]+)/,
      /playlist\?list=([^&\n?#]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    
    return null
  }, [])

  // Função para gerar thumbnail do YouTube
  const generateThumbnail = useCallback((videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }, [])

  // Buscar informações da playlist do YouTube
  const fetchPlaylistInfo = useCallback(async (youtubeUrl: string): Promise<YouTubePlaylist | null> => {
    setState(prev => ({ ...prev, loadingPlaylist: true, error: null }))
    
    try {
      const playlistId = youtubeService.extractPlaylistId(youtubeUrl)
      if (!playlistId) {
        throw new Error('URL da playlist do YouTube inválida')
      }

      const playlistInfo = await youtubeService.getPlaylistInfo(playlistId, youtubeUrl)
      setState(prev => ({ ...prev, loadingPlaylist: false }))
      
      return playlistInfo
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar informações da playlist'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loadingPlaylist: false
      }))
      return null
    }
  }, [])

  // Buscar informações de vídeo individual do YouTube
  const fetchVideoInfo = useCallback(async (youtubeUrl: string): Promise<YouTubeVideo | null> => {
    setState(prev => ({ ...prev, loadingVideo: true, error: null }))
    
    try {
      const videoId = extractYouTubeId(youtubeUrl)
      if (!videoId) {
        throw new Error('URL do vídeo do YouTube inválida')
      }

      const videoInfo = await youtubeService.getVideoInfo(videoId)
      setState(prev => ({ ...prev, loadingVideo: false }))
      
      if (videoInfo) {
        // Adicionar duração formatada para o modal
        return {
          ...videoInfo,
          formattedDuration: youtubeService.formatVideoDuration(videoInfo.duration)
        }
      }
      
      return null
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar informações do vídeo'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loadingVideo: false
      }))
      return null
    }
  }, [extractYouTubeId])

  // Adicionar nova série/playlist
  const addPlaylistSeries = useCallback(async (youtubeUrl: string, customData?: Partial<PlaylistSeries>) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const playlistId = youtubeService.extractPlaylistId(youtubeUrl)
      if (!playlistId) {
        throw new Error('URL da playlist do YouTube inválida')
      }

      // Buscar informações reais da playlist
      const playlistInfo = await youtubeService.getPlaylistInfo(playlistId, youtubeUrl)
      if (!playlistInfo) {
        throw new Error('Não foi possível obter informações da playlist')
      }

      const newSeries: PlaylistSeries = {
        id: Date.now().toString(),
        title: customData?.title || playlistInfo.title,
        description: customData?.description || playlistInfo.description,
        thumbnail: customData?.thumbnail || (playlistInfo.videos && playlistInfo.videos.length > 0 
          ? `https://img.youtube.com/vi/${playlistInfo.videos[0].id}/maxresdefault.jpg`
          : `https://i.ytimg.com/vi/placeholder/maxresdefault.jpg`),
        totalVideos: playlistInfo.videoCount,
        duration: playlistInfo.totalDuration, // Duração calculada automaticamente!
        completed: 0,
        youtubePlaylistId: playlistId,
        difficulty: customData?.difficulty || 'Iniciante',
        ...customData
      }

      setState(prev => ({
        ...prev,
        playlistSeries: [...prev.playlistSeries, newSeries],
        loading: false
      }))

      return newSeries
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar série'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }))
      return null
    }
  }, [])

  // Adicionar novo treinamento individual
  const addIndividualTraining = useCallback(async (youtubeUrl: string, customData?: Partial<IndividualTraining>) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const videoId = extractYouTubeId(youtubeUrl)
      if (!videoId) {
        throw new Error('URL do vídeo do YouTube inválida')
      }

      // Buscar informações reais do vídeo
      const videoInfo = await youtubeService.getVideoInfo(videoId)
      if (!videoInfo) {
        throw new Error('Não foi possível obter informações do vídeo')
      }

      const newTraining: IndividualTraining = {
        id: Date.now().toString(),
        title: customData?.title || videoInfo.title,
        description: customData?.description || 'Treinamento importado do YouTube',
        thumbnail: generateThumbnail(videoId),
        duration: youtubeService.formatVideoDuration(videoInfo.duration), // Duração calculada automaticamente!
        youtubeId: videoId,
        tags: customData?.tags || ['YouTube'],
        difficulty: customData?.difficulty || 'Iniciante',
        originalUrl: youtubeUrl, // Salvar URL original para preservar playlist
        ...customData
      }

      setState(prev => ({
        ...prev,
        individualTrainings: [...prev.individualTrainings, newTraining],
        loading: false
      }))

      return newTraining
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar treinamento'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }))
      return null
    }
  }, [extractYouTubeId, generateThumbnail])

  // Remover série
  const removePlaylistSeries = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      playlistSeries: prev.playlistSeries.filter(series => series.id !== id)
    }))
  }, [])

  // Remover treinamento
  const removeIndividualTraining = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      individualTrainings: prev.individualTrainings.filter(training => training.id !== id)
    }))
  }, [])

  // Limpar erro
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Carregar dados mock iniciais
  const loadMockData = useCallback(() => {
    const mockPlaylistSeries: PlaylistSeries[] = [
      {
        id: "1",
        title: "Curso Completo de React.js",
        description: "Do básico ao avançado, aprenda React.js de forma completa e prática",
        thumbnail: "https://img.youtube.com/vi/w7ejDZ8SWv8/maxresdefault.jpg",
        totalVideos: 25,
        duration: "15h 30min",
        completed: 12,
        youtubePlaylistId: "PLnDvRpP8BneyVA0SZ2okm-QBojomniQVO",
        difficulty: "Intermediário"
      },
      {
        id: "2",
        title: "JavaScript Moderno - ES6+",
        description: "Aprenda todas as funcionalidades modernas do JavaScript",
        thumbnail: "https://img.youtube.com/vi/HN1UjzRSdBk/maxresdefault.jpg",
        totalVideos: 18,
        duration: "12h 15min",
        completed: 5,
        youtubePlaylistId: "PLnDvRpP8BneyVA0SZ2okm-QBojomniQVO",
        difficulty: "Avançado"
      },
      {
        id: "3",
        title: "Node.js e Express",
        description: "Backend completo com Node.js, Express e MongoDB",
        thumbnail: "https://img.youtube.com/vi/Oe421EPjeBE/maxresdefault.jpg",
        totalVideos: 32,
        duration: "20h 45min",
        completed: 0,
        youtubePlaylistId: "PLnDvRpP8BneyVA0SZ2okm-QBojomniQVO",
        difficulty: "Iniciante"
      }
    ]

    const mockIndividualTrainings: IndividualTraining[] = [
      {
        id: "1",
        title: "Como usar Hooks no React",
        description: "Aprenda useState, useEffect e hooks personalizados",
        thumbnail: "https://img.youtube.com/vi/6ThXsUwLWvc/maxresdefault.jpg",
        duration: "45min",
        youtubeId: "6ThXsUwLWvc",
        tags: ["React", "Hooks", "JavaScript"],
        difficulty: "Intermediário",
        originalUrl: "https://www.youtube.com/watch?v=6ThXsUwLWvc"
      },
      {
        id: "2",
        title: "Deploy de Apps React na Vercel",
        description: "Como fazer deploy de aplicações React de forma gratuita",
        thumbnail: "https://img.youtube.com/vi/2HBIzEx6IZA/maxresdefault.jpg",
        duration: "30min",
        youtubeId: "2HBIzEx6IZA",
        tags: ["Deploy", "Vercel", "React"],
        difficulty: "Iniciante",
        originalUrl: "https://www.youtube.com/watch?v=2HBIzEx6IZA"
      },
      {
        id: "3",
        title: "API REST com Node.js",
        description: "Construa uma API completa com autenticação",
        thumbnail: "https://img.youtube.com/vi/BN_8bCfVp88/maxresdefault.jpg",
        duration: "1h 15min",
        youtubeId: "BN_8bCfVp88",
        tags: ["Node.js", "API", "REST"],
        difficulty: "Avançado",
        originalUrl: "https://www.youtube.com/watch?v=BN_8bCfVp88&list=PLJ_KhUnlXUPtbtLwaxxUxHqvcNQndmI4B"
      },
      {
        id: "4",
        title: "CSS Grid Layout",
        description: "Master CSS Grid para layouts modernos",
        thumbnail: "https://img.youtube.com/vi/EFafSYg-PkI/maxresdefault.jpg",
        duration: "38min",
        youtubeId: "EFafSYg-PkI",
        tags: ["CSS", "Layout", "Frontend"],
        difficulty: "Intermediário",
        originalUrl: "https://www.youtube.com/watch?v=EFafSYg-PkI&list=PLJ_KhUnlXUPtbtLwaxxUxHqvcNQndmI4B"
      }
    ]

    setState(prev => ({
      ...prev,
      playlistSeries: mockPlaylistSeries,
      individualTrainings: mockIndividualTrainings
    }))
  }, [])

  return {
    // Estado
    playlistSeries: state.playlistSeries,
    individualTrainings: state.individualTrainings,
    loading: state.loading,
    loadingPlaylist: state.loadingPlaylist,
    loadingVideo: state.loadingVideo,
    error: state.error,
    
    // Ações
    addPlaylistSeries,
    addIndividualTraining,
    removePlaylistSeries,
    removeIndividualTraining,
    clearError,
    loadMockData,
    fetchPlaylistInfo,
    fetchVideoInfo,
    
    // Utilitários
    extractYouTubeId,
    extractPlaylistId,
    generateThumbnail
  }
}