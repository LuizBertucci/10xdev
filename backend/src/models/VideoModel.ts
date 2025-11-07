import { randomUUID } from 'crypto'
import { supabase } from '@/database/supabase'
import type {
  VideoRow,
  VideoInsert,
  VideoResponse,
  CreateVideoRequest,
  ModelResult,
  ModelListResult
} from '@/types/video'

function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      return u.searchParams.get('v')
    }
    if (u.hostname === 'youtu.be') {
      const videoId = u.pathname.slice(1).split('?')[0]
      return videoId || null
    }
    if (u.hostname.includes('youtube.com') && u.pathname.includes('/embed/')) {
      return u.pathname.split('/embed/')[1]?.split('?')[0] || null
    }
    if (u.hostname.includes('youtube.com') && u.pathname.includes('/shorts/')) {
      return u.pathname.split('/shorts/')[1]?.split('?')[0] || null
    }
    return null
  } catch {
    return null
  }
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export class VideoModel {

  private static toResponse(row: VideoRow): VideoResponse {
    const response: VideoResponse = {
      id: row.id,
      title: row.title,
      youtubeUrl: row.youtube_url,
      videoId: row.video_id,
      thumbnail: row.thumbnail,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }

    if (row.description !== undefined && row.description !== null) {
      response.description = row.description
    }
    if (row.category !== undefined && row.category !== null) {
      response.category = row.category
    }
    if (row.tags !== undefined && row.tags !== null) {
      response.tags = row.tags
    }
    if (row.selected_card_feature_id !== undefined && row.selected_card_feature_id !== null) {
      response.selectedCardFeatureId = row.selected_card_feature_id
    }

    return response
  }

  static async list(): Promise<ModelListResult<VideoResponse>> {
    try {
      const { data, error, count } = await supabase
        .from('videos')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      // Sempre retornar um array, mesmo que vazio
      const videos = Array.isArray(data) ? data.map((r) => this.toResponse(r as unknown as VideoRow)) : []
      return { success: true, data: videos, count: count ?? 0, statusCode: 200 }
    } catch (e) {
      console.error('Erro no VideoModel.list:', e)
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async getById(id: string): Promise<ModelResult<VideoResponse>> {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { success: false, error: error.message.includes('PGRST116') ? 'Vídeo não encontrado' : error.message, statusCode: error.code === 'PGRST116' ? 404 : 400 }
      }

      return { success: true, data: this.toResponse(data as unknown as VideoRow), statusCode: 200 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async create(payload: CreateVideoRequest): Promise<ModelResult<VideoResponse>> {
    try {
      const videoId = extractYouTubeVideoId(payload.youtubeUrl)
      if (!videoId) {
        return { success: false, error: 'URL do YouTube inválida', statusCode: 400 }
      }

      const insertData: VideoInsert = {
        id: randomUUID(),
        title: payload.title,
        youtube_url: payload.youtubeUrl,
        video_id: videoId,
        thumbnail: getYouTubeThumbnail(videoId),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (payload.description !== undefined) {
        insertData.description = payload.description
      }
      if (payload.category !== undefined) {
        insertData.category = payload.category
      }
      if (payload.tags !== undefined) {
        insertData.tags = payload.tags
      }

      const { data, error } = await supabase
        .from('videos')
        .insert(insertData)
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      return { success: true, data: this.toResponse(data as unknown as VideoRow), statusCode: 201 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async update(id: string, payload: Partial<CreateVideoRequest>): Promise<ModelResult<VideoResponse>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (payload.title !== undefined) {
        updateData.title = payload.title
      }
      if (payload.description !== undefined) {
        updateData.description = payload.description
      }
      if (payload.youtubeUrl !== undefined) {
        const videoId = extractYouTubeVideoId(payload.youtubeUrl)
        if (!videoId) {
          return { success: false, error: 'URL do YouTube inválida', statusCode: 400 }
        }
        updateData.youtube_url = payload.youtubeUrl
        updateData.video_id = videoId
        updateData.thumbnail = getYouTubeThumbnail(videoId)
      }
      if (payload.category !== undefined) {
        updateData.category = payload.category
      }
      if (payload.tags !== undefined) {
        updateData.tags = payload.tags
      }

      const { data, error } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      return { success: true, data: this.toResponse(data as unknown as VideoRow), statusCode: 200 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async delete(id: string): Promise<ModelResult<null>> {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      return { success: true, data: null, statusCode: 200 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async updateSelectedCardFeature(id: string, cardFeatureId: string | null): Promise<ModelResult<VideoResponse>> {
    try {
      const { data, error } = await supabase
        .from('videos')
        .update({ 
          selected_card_feature_id: cardFeatureId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      return { success: true, data: this.toResponse(data as unknown as VideoRow), statusCode: 200 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }
}

