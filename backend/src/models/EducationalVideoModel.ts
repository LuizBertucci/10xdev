import { randomUUID } from 'crypto'
import { supabaseTyped } from '@/database/supabase'
import type {
  EducationalVideoRow,
  EducationalVideoInsert,
  EducationalVideoResponse,
  CreateEducationalVideoRequest,
  ModelResult,
  ModelListResult
} from '@/types/educational'

function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      return u.searchParams.get('v')
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('?')[0]
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

export class EducationalVideoModel {
  private static tableName = 'educational_videos'

  private static toResponse(row: EducationalVideoRow): EducationalVideoResponse {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      youtubeUrl: row.youtube_url,
      videoId: row.video_id,
      thumbnail: row.thumbnail,
      category: row.category || undefined,
      tags: row.tags || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  static async list(): Promise<ModelListResult<EducationalVideoResponse>> {
    try {
      const { data, error, count } = await supabaseTyped
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      const videos = (data || []).map((r) => this.toResponse(r as unknown as EducationalVideoRow))
      return { success: true, data: videos, count: count || videos.length, statusCode: 200 }
    } catch (e) {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async getById(id: string): Promise<ModelResult<EducationalVideoResponse>> {
    try {
      const { data, error } = await supabaseTyped
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { success: false, error: error.message.includes('PGRST116') ? 'Vídeo não encontrado' : error.message, statusCode: error.code === 'PGRST116' ? 404 : 400 }
      }

      return { success: true, data: this.toResponse(data as unknown as EducationalVideoRow), statusCode: 200 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async create(payload: CreateEducationalVideoRequest): Promise<ModelResult<EducationalVideoResponse>> {
    try {
      const videoId = extractYouTubeVideoId(payload.youtubeUrl)
      if (!videoId) {
        return { success: false, error: 'URL do YouTube inválida', statusCode: 400 }
      }

      const insertData: EducationalVideoInsert = {
        id: randomUUID(),
        title: payload.title,
        description: payload.description,
        youtube_url: payload.youtubeUrl,
        video_id: videoId,
        thumbnail: getYouTubeThumbnail(videoId),
        category: payload.category,
        tags: payload.tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabaseTyped
        .from(this.tableName)
        .insert(insertData)
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      return { success: true, data: this.toResponse(data as unknown as EducationalVideoRow), statusCode: 201 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async delete(id: string): Promise<ModelResult<null>> {
    try {
      const { error } = await supabaseTyped
        .from(this.tableName)
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
}


