import { supabaseTyped } from '@/database/supabase'
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
  private static tableName = 'card_features'

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
      content_type: row.content_type,  // Adicionar campo
      screens: row.screens,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private static buildQuery(params: CardFeatureQueryParams = {}) {
    let query = supabaseTyped
      .from(this.tableName)
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
        title: data.title,
        tech: data.tech,
        language: data.language,
        description: data.description,
        content_type: data.content_type,
        screens: processedScreens,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: result, error } = await supabaseTyped
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar CardFeature:', error)
        return {
          success: false,
          error: error.message,
          statusCode: 400
        }
      }

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 201
      }
    } catch (error) {
      console.error('Erro interno ao criar CardFeature:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
      }
    }
  }

  // ================================================
  // READ
  // ================================================

  static async findById(id: string): Promise<ModelResult<CardFeatureResponse>> {
    try {
      const { data, error } = await supabaseTyped
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'CardFeature não encontrado',
            statusCode: 404
          }
        }
        return {
          success: false,
          error: error.message,
          statusCode: 400
        }
      }

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 200
      }
    } catch (error) {
      console.error('Erro interno ao buscar CardFeature:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
      }
    }
  }

  static async findAll(params: CardFeatureQueryParams = {}): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const query = this.buildQuery(params)
      const { data, error, count } = await query

      if (error) {
        return {
          success: false,
          error: error.message,
          statusCode: 400
        }
      }

      const transformedData = data?.map(row => this.transformToResponse(row)) || []

      return {
        success: true,
        data: transformedData,
        count: count || 0,
        statusCode: 200
      }
    } catch (error) {
      console.error('Erro interno ao listar CardFeatures:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
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

      const { data: result, error } = await supabaseTyped
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: error.message,
          statusCode: 400
        }
      }

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 200
      }
    } catch (error) {
      console.error('Erro interno ao atualizar CardFeature:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
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

      const { error } = await supabaseTyped
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) {
        return {
          success: false,
          error: error.message,
          statusCode: 400
        }
      }

      return {
        success: true,
        data: null,
        statusCode: 200
      }
    } catch (error) {
      console.error('Erro interno ao deletar CardFeature:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
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
      const { count: total, error: countError } = await supabaseTyped
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })

      if (countError) {
        return {
          success: false,
          error: countError.message,
          statusCode: 400
        }
      }

      // Group by tech
      const { data: techData, error: techError } = await supabaseTyped
        .from(this.tableName)
        .select('tech')

      if (techError) {
        return {
          success: false,
          error: techError.message,
          statusCode: 400
        }
      }

      // Group by language
      const { data: languageData, error: languageError } = await supabaseTyped
        .from(this.tableName)
        .select('language')

      if (languageError) {
        return {
          success: false,
          error: languageError.message,
          statusCode: 400
        }
      }

      // Recent count (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count: recentCount, error: recentError } = await supabaseTyped
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())

      if (recentError) {
        return {
          success: false,
          error: recentError.message,
          statusCode: 400
        }
      }

      // Process counts
      const byTech = techData?.reduce((acc, item) => {
        acc[item.tech] = (acc[item.tech] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const byLanguage = languageData?.reduce((acc, item) => {
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
    } catch (error) {
      console.error('Erro interno ao buscar estatísticas:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
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
        screens: item.screens,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await supabaseTyped
        .from(this.tableName)
        .insert(insertData)
        .select()

      if (error) {
        return {
          success: false,
          error: error.message,
          statusCode: 400
        }
      }

      const transformedData = data?.map(row => this.transformToResponse(row)) || []

      return {
        success: true,
        data: transformedData,
        count: transformedData.length,
        statusCode: 201
      }
    } catch (error) {
      console.error('Erro interno ao criar CardFeatures em lote:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
      }
    }
  }

  static async bulkDelete(ids: string[]): Promise<ModelResult<{ deletedCount: number }>> {
    try {
      const { error, count } = await supabaseTyped
        .from(this.tableName)
        .delete({ count: 'exact' })
        .in('id', ids)

      if (error) {
        return {
          success: false,
          error: error.message,
          statusCode: 400
        }
      }

      return {
        success: true,
        data: { deletedCount: count || 0 },
        statusCode: 200
      }
    } catch (error) {
      console.error('Erro interno ao deletar CardFeatures em lote:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
      }
    }
  }
}