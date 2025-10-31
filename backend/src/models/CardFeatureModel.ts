import { supabase, executeQuery } from '@/database/supabase'
import { randomUUID } from 'crypto'
import type {
  CardFeatureRow,
  CardFeatureInsert,
  CardFeatureUpdate,
  CardFeatureResponse,
  CardFeatureQueryParams,
  CardFeatureFilters,
  ModelResult,
  ModelListResult,
  CreateCardFeatureRequest,
  ContentType,
  ContentBlock
} from '@/types/cardfeature'

export class CardFeatureModel {
  // ================================================
  // PRIVATE HELPERS
  // ================================================

  private static transformToResponse(row: CardFeatureRow): CardFeatureResponse {
    return {
      id: row.id,
      title: row.title,
      tech: row.tech,
      language: row.language,
      description: row.description,
      content_type: row.content_type,
      card_type: row.card_type,
      screens: row.screens,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private static buildQuery(params: CardFeatureQueryParams = {}) {
    let query = supabase
      .from('card_features')
      .select('*', { count: 'exact' })

    // Filtros
    if (params.tech && params.tech !== 'all') {
      query = query.ilike('tech', params.tech)
    }

    if (params.language && params.language !== 'all') {
      query = query.ilike('language', params.language)
    }

    // Adicionar filtro por content_type
    if (params.content_type && params.content_type !== 'all') {
      query = query.eq('content_type', params.content_type)
    }

    // Adicionar filtro por card_type
    if (params.card_type && params.card_type !== 'all') {
      query = query.eq('card_type', params.card_type)
    }

    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,tech.ilike.%${params.search}%`)
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

    return query
  }

  // ================================================
  // CREATE
  // ================================================

  static async create(data: CreateCardFeatureRequest): Promise<ModelResult<CardFeatureResponse>> {
    try {
      // Processar screens para adicionar IDs e order aos blocos
      const processedScreens = data.screens.map(screen => ({
        ...screen,
        blocks: screen.blocks.map((block, index) => ({
          ...block,
          id: randomUUID(),
          order: block.order || index
        }))
      }))

      const insertData: CardFeatureInsert = {
        id: randomUUID(),
        title: data.title || '',
        tech: data.tech || 'React',
        language: data.language || 'typescript',
        description: data.description || '',
        content_type: data.content_type || 'code',
        card_type: data.card_type || 'codigos',
        screens: processedScreens,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: result } = await executeQuery(
        supabase
          .from('card_features')
          .insert(insertData)
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 201
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // READ
  // ================================================

  static async findById(id: string): Promise<ModelResult<CardFeatureResponse>> {
    try {
      const { data } = await executeQuery(
        supabase
          .from('card_features')
          .select('*')
          .eq('id', id)
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async findAll(params: CardFeatureQueryParams = {}): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const query = this.buildQuery(params)
      const { data, count } = await executeQuery(query)

      const transformedData = data?.map((row: any) => this.transformToResponse(row)) || []

      return {
        success: true,
        data: transformedData,
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async search(searchTerm: string, params: CardFeatureQueryParams = {}): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const searchParams = { ...params, search: searchTerm }
      return await this.findAll(searchParams)
    } catch (error) {
      console.error('Erro interno ao buscar CardFeatures:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
      }
    }
  }

  static async findByTech(tech: string, params: CardFeatureQueryParams = {}): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const techParams = { ...params, tech }
      return await this.findAll(techParams)
    } catch (error) {
      console.error('Erro interno ao buscar CardFeatures por tech:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
      }
    }
  }

  // ================================================
  // UPDATE
  // ================================================

  static async update(id: string, data: Partial<CreateCardFeatureRequest>): Promise<ModelResult<CardFeatureResponse>> {
    try {
      // Verificar se existe
      const existingCheck = await this.findById(id)
      if (!existingCheck.success) {
        return existingCheck
      }

      const updateData: CardFeatureUpdate = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: result } = await executeQuery(
        supabase
          .from('card_features')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // DELETE
  // ================================================

  static async delete(id: string): Promise<ModelResult<null>> {
    try {
      // Verificar se existe
      const existingCheck = await this.findById(id)
      if (!existingCheck.success) {
        return {
          success: false,
          error: existingCheck.error || 'Erro ao verificar CardFeature',
          statusCode: existingCheck.statusCode || 404
        }
      }

      await executeQuery(
        supabase
          .from('card_features')
          .delete()
          .eq('id', id)
      )

      return {
        success: true,
        data: null,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // STATISTICS
  // ================================================

  static async getStats(): Promise<ModelResult<{
    total: number
    byTech: Record<string, number>
    byLanguage: Record<string, number>
    recentCount: number
  }>> {
    try {
      // Total count
      const { count: total } = await executeQuery(
        supabase
          .from('card_features')
          .select('*', { count: 'exact', head: true })
      )

      // Group by tech
      const { data: techData } = await executeQuery(
        supabase
          .from('card_features')
          .select('tech')
      )

      // Group by language
      const { data: languageData } = await executeQuery(
        supabase
          .from('card_features')
          .select('language')
      )

      // Recent count (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count: recentCount } = await executeQuery(
        supabase
          .from('card_features')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString())
      )

      // Process counts
      const byTech = (techData as any)?.reduce((acc: any, item: any) => {
        acc[item.tech] = (acc[item.tech] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const byLanguage = (languageData as any)?.reduce((acc: any, item: any) => {
        acc[item.language] = (acc[item.language] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return {
        success: true,
        data: {
          total: total || 0,
          byTech,
          byLanguage,
          recentCount: recentCount || 0
        },
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // BULK OPERATIONS
  // ================================================

  static async bulkCreate(items: CreateCardFeatureRequest[]): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const insertData: CardFeatureInsert[] = items.map(item => ({
        id: randomUUID(),
        title: item.title,
        tech: item.tech,
        language: item.language,
        description: item.description,
        content_type: item.content_type,
        card_type: item.card_type || 'codigos',
        screens: item.screens,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data } = await executeQuery(
        supabase
          .from('card_features')
          .insert(insertData)
          .select()
      )

      const transformedData = data?.map((row: any) => this.transformToResponse(row)) || []

      return {
        success: true,
        data: transformedData,
        count: transformedData.length,
        statusCode: 201
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async bulkDelete(ids: string[]): Promise<ModelResult<{ deletedCount: number }>> {
    try {
      const { count } = await executeQuery(
        supabase
          .from('card_features')
          .delete({ count: 'exact' })
          .in('id', ids)
      )

      return {
        success: true,
        data: { deletedCount: count || 0 },
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }
}