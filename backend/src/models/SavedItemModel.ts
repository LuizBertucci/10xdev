import { supabaseAdmin, executeQuery } from '@/database/supabase'
import type {
  SavedItemRow,
  SavedItemInsert,
  SavedItemResponse,
  ItemType,
  ModelResult,
  ModelListResult
} from '@/types/saveditem'

export class SavedItemModel {
  // ================================================
  // PRIVATE HELPERS
  // ================================================

  private static transformToResponse(row: SavedItemRow, item?: any): SavedItemResponse {
    return {
      id: row.id,
      itemType: row.item_type,
      itemId: row.item_id,
      createdAt: row.created_at,
      item
    }
  }

  // ================================================
  // SAVE ITEM
  // ================================================

  static async save(userId: string, itemType: ItemType, itemId: string): Promise<ModelResult<SavedItemResponse>> {
    try {
      const insertData: SavedItemInsert = {
        user_id: userId,
        item_type: itemType,
        item_id: itemId
      }

      const { data } = await executeQuery(
        supabaseAdmin
          .from('saved_items')
          .insert(insertData)
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 201
      }
    } catch (error: any) {
      // Tratar erro de duplicata (já salvo)
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Item já está salvo',
          statusCode: 409
        }
      }
      return {
        success: false,
        error: error.message || 'Erro ao salvar item',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // UNSAVE ITEM
  // ================================================

  static async unsave(userId: string, itemType: ItemType, itemId: string): Promise<ModelResult<null>> {
    try {
      const { error } = await supabaseAdmin
        .from('saved_items')
        .delete()
        .eq('user_id', userId)
        .eq('item_type', itemType)
        .eq('item_id', itemId)

      if (error) {
        throw error
      }

      return {
        success: true,
        data: null,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao remover item salvo',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // FIND BY USER (com dados expandidos)
  // ================================================

  static async findByUser(userId: string, itemType?: ItemType): Promise<ModelListResult<SavedItemResponse>> {
    try {
      let query = supabaseAdmin
        .from('saved_items')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (itemType) {
        query = query.eq('item_type', itemType)
      }

      const { data, count } = await executeQuery(query)

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          count: 0,
          statusCode: 200
        }
      }

      // Agrupar IDs por tipo para fazer JOINs
      const videoIds = data
        .filter((item: SavedItemRow) => item.item_type === 'video')
        .map((item: SavedItemRow) => item.item_id)
      
      const cardIds = data
        .filter((item: SavedItemRow) => item.item_type === 'card')
        .map((item: SavedItemRow) => item.item_id)

      // Buscar dados expandidos
      let videosMap = new Map()
      let cardsMap = new Map()

      if (videoIds.length > 0) {
        const { data: videos } = await executeQuery(
          supabaseAdmin
            .from('videos')
            .select('*')
            .in('id', videoIds)
        )
        if (videos) {
          videosMap = new Map(videos.map((v: any) => [v.id, {
            id: v.id,
            title: v.title,
            description: v.description,
            youtubeUrl: v.youtube_url,
            videoId: v.video_id,
            thumbnail: v.thumbnail,
            category: v.category,
            createdAt: v.created_at
          }]))
        }
      }

      if (cardIds.length > 0) {
        const { data: cards } = await executeQuery(
          supabaseAdmin
            .from('card_features')
            .select('*')
            .in('id', cardIds)
        )
        if (cards) {
          cardsMap = new Map(cards.map((c: any) => [c.id, {
            id: c.id,
            title: c.title,
            tech: c.tech,
            language: c.language,
            description: c.description,
            content_type: c.content_type,
            card_type: c.card_type,
            screens: c.screens,
            createdBy: c.created_by,
            isPrivate: c.is_private,
            createdAt: c.created_at
          }]))
        }
      }

      // Transformar resultados com dados expandidos
      const transformedData = data.map((row: SavedItemRow) => {
        const itemData = row.item_type === 'video' 
          ? videosMap.get(row.item_id)
          : cardsMap.get(row.item_id)
        return this.transformToResponse(row, itemData)
      })

      return {
        success: true,
        data: transformedData,
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar itens salvos',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // CHECK IF SAVED
  // ================================================

  static async isSaved(userId: string, itemType: ItemType, itemId: string): Promise<ModelResult<boolean>> {
    try {
      const { data, count } = await executeQuery(
        supabaseAdmin
          .from('saved_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('item_type', itemType)
          .eq('item_id', itemId)
      )

      return {
        success: true,
        data: (count || 0) > 0,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao verificar item salvo',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // CHECK MULTIPLE (para carregar estado de lista)
  // ================================================

  static async checkMultiple(userId: string, itemType: ItemType, itemIds: string[]): Promise<ModelResult<string[]>> {
    try {
      if (itemIds.length === 0) {
        return {
          success: true,
          data: [],
          statusCode: 200
        }
      }

      const { data } = await executeQuery(
        supabaseAdmin
          .from('saved_items')
          .select('item_id')
          .eq('user_id', userId)
          .eq('item_type', itemType)
          .in('item_id', itemIds)
      )

      const savedIds = data?.map((item: any) => item.item_id) || []

      return {
        success: true,
        data: savedIds,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao verificar itens salvos',
        statusCode: error.statusCode || 500
      }
    }
  }
}

