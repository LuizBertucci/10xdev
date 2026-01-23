import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/database/supabase'
import { ContentType } from '@/types/content'
import type {
  ContentRow,
  ContentInsert,
  ContentResponse,
  CreateContentRequest,
  ContentQueryParams,
  ModelResult,
  ModelListResult
} from '@/types/content'

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

export class ContentModel {

  private static toResponse(row: ContentRow): ContentResponse {
    const response: ContentResponse = {
      id: row.id,
      title: row.title,
      contentType: row.content_type || ContentType.VIDEO,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }

    if (row.description !== undefined && row.description !== null) {
      response.description = row.description
    }
    if (row.youtube_url !== undefined && row.youtube_url !== null) {
      response.youtubeUrl = row.youtube_url
    }
    if (row.video_id !== undefined && row.video_id !== null) {
      response.videoId = row.video_id
    }
    if (row.thumbnail !== undefined && row.thumbnail !== null) {
      response.thumbnail = row.thumbnail
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
    if (row.file_url !== undefined && row.file_url !== null) {
      response.fileUrl = row.file_url
    }
    if (row.file_type !== undefined && row.file_type !== null) {
      response.fileType = row.file_type
    }
    if (row.file_size !== undefined && row.file_size !== null) {
      response.fileSize = row.file_size
    }
    if (row.markdown_content !== undefined && row.markdown_content !== null) {
      response.markdownContent = row.markdown_content
    }

    return response
  }

  static async list(params: ContentQueryParams = {}): Promise<ModelListResult<ContentResponse>> {
    try {
      let query = supabaseAdmin
        .from('contents')
        .select('*', { count: 'exact' })

      // Filtro por tipo de conteúdo
      if (params.contentType) {
        query = query.eq('content_type', params.contentType)
      }

      // Filtro por categoria
      if (params.category) {
        query = query.eq('category', params.category)
      }

      // Filtro por busca
      if (params.search) {
        query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
      }

      // Ordenação
      const sortBy = params.sortBy || 'created_at'
      const sortOrder = params.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Paginação
      if (params.page && params.limit) {
        const from = (params.page - 1) * params.limit
        const to = from + params.limit - 1
        query = query.range(from, to)
      }

      const { data, error, count } = await query

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      const contents = Array.isArray(data) ? data.map((r) => this.toResponse(r as unknown as ContentRow)) : []
      return { success: true, data: contents, count: count ?? 0, statusCode: 200 }
    } catch (e) {
      console.error('Erro no ContentModel.list:', e)
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async getById(id: string): Promise<ModelResult<ContentResponse>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('contents')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { success: false, error: error.message.includes('PGRST116') ? 'Conteúdo não encontrado' : error.message, statusCode: error.code === 'PGRST116' ? 404 : 400 }
      }

      return { success: true, data: this.toResponse(data as unknown as ContentRow), statusCode: 200 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async create(payload: CreateContentRequest): Promise<ModelResult<ContentResponse>> {
    try {
      console.log('[ContentModel.create] Payload recebido:', JSON.stringify(payload, null, 2))
      
      const contentType = payload.contentType || ContentType.VIDEO
      console.log('[ContentModel.create] ContentType:', contentType)

      const insertData: ContentInsert = {
        id: randomUUID(),
        title: payload.title,
        content_type: contentType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('[ContentModel.create] InsertData inicial:', JSON.stringify(insertData, null, 2))

      // Campos opcionais comuns
      if (payload.description !== undefined) {
        insertData.description = payload.description
      }
      if (payload.category !== undefined) {
        insertData.category = payload.category
      }
      if (payload.tags !== undefined) {
        insertData.tags = payload.tags
      }

      // Campos específicos para vídeo
      if (contentType === ContentType.VIDEO && payload.youtubeUrl) {
        const videoId = extractYouTubeVideoId(payload.youtubeUrl)
        if (!videoId) {
          return { success: false, error: 'URL do YouTube inválida', statusCode: 400 }
        }
        insertData.youtube_url = payload.youtubeUrl
        insertData.video_id = videoId
        insertData.thumbnail = getYouTubeThumbnail(videoId)
      }

      // Campos específicos para posts
      if (payload.fileUrl !== undefined) {
        insertData.file_url = payload.fileUrl
      }
      if (payload.fileType !== undefined) {
        insertData.file_type = payload.fileType
      }
      if (payload.fileSize !== undefined) {
        insertData.file_size = payload.fileSize
      }
      if (payload.markdownContent !== undefined) {
        insertData.markdown_content = payload.markdownContent
      }

      console.log('[ContentModel.create] Inserindo no banco:', JSON.stringify(insertData, null, 2))
      
      const { data, error } = await supabaseAdmin
        .from('contents')
        .insert(insertData)
        .select('*')
        .single()

      if (error) {
        console.log('[ContentModel.create] Erro do Supabase:', error.message)
        console.log('[ContentModel.create] Erro detalhado:', JSON.stringify(error, null, 2))
        return { success: false, error: error.message, statusCode: 400 }
      }
      
      console.log('[ContentModel.create] Sucesso! Dados inseridos:', JSON.stringify(data, null, 2))

      return { success: true, data: this.toResponse(data as unknown as ContentRow), statusCode: 201 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async update(id: string, payload: Partial<CreateContentRequest>): Promise<ModelResult<ContentResponse>> {
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
      if (payload.contentType !== undefined) {
        updateData.content_type = payload.contentType
      }
      if (payload.fileUrl !== undefined) {
        updateData.file_url = payload.fileUrl
      }
      if (payload.fileType !== undefined) {
        updateData.file_type = payload.fileType
      }
      if (payload.fileSize !== undefined) {
        updateData.file_size = payload.fileSize
      }
      if (payload.markdownContent !== undefined) {
        updateData.markdown_content = payload.markdownContent
      }

      const { data, error } = await supabaseAdmin
        .from('contents')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      return { success: true, data: this.toResponse(data as unknown as ContentRow), statusCode: 200 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async delete(id: string): Promise<ModelResult<null>> {
    try {
      const { error } = await supabaseAdmin
        .from('contents')
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

  static async updateSelectedCardFeature(id: string, cardFeatureId: string | null): Promise<ModelResult<ContentResponse>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('contents')
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

      return { success: true, data: this.toResponse(data as unknown as ContentRow), statusCode: 200 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }
}
