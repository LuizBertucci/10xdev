import { supabaseTyped } from '../database/supabase'
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
  CreateCardFeatureRequest
} from '../types/cardfeature'

export class CardFeatureModel {
  private static readonly TABLE_NAME = 'card_features'


  private static transformToResponse(row: CardFeatureRow): CardFeatureResponse {
    return {
      id: row.id,
      title: row.title,
      tech: row.tech,
      language: row.language,
      description: row.description,
      screens: row.screens,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private static buildQuery(params: CardFeatureQueryParams = {}) {
    let query = supabaseTyped
      .from(this.TABLE_NAME)
      .select('*', { count: 'exact' })

    if (params.tech && params.tech !== 'all') {
      query = query.ilike('tech', params.tech)
    }

    if (params.language && params.language !== 'all') {
      query = query.ilike('language', params.language)
    }

    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,tech.ilike.%${params.search}%`)
    }

    const sortBy = params.sortBy || 'created_at'
    const sortOrder = params.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    if (params.page && params.limit) {
      const from = (params.page - 1) * params.limit
      const to = from + params.limit - 1
      query = query.range(from, to)
    }

    return query
  }


  static async create(data: CreateCardFeatureRequest): Promise<ModelResult<CardFeatureResponse>> {
    try {
      const insertData: CardFeatureInsert = {
        id: randomUUID(),
        title: data.title,
        tech: data.tech,
        language: data.language,
        description: data.description,
        screens: data.screens,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: result, error } = await supabaseTyped
        .from(this.TABLE_NAME)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error creating CardFeature:', error)
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
      console.error('Internal error creating CardFeature:', error)
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }


  static async findById(id: string): Promise<ModelResult<CardFeatureResponse>> {
    try {
      const { data, error } = await supabaseTyped
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'CardFeature not found',
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
      console.error('Internal error finding CardFeature:', error)
      return {
        success: false,
        error: 'Internal server error',
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
      console.error('Internal error listing CardFeatures:', error)
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }

  static async search(searchTerm: string, params: CardFeatureQueryParams = {}): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const searchParams = { ...params, search: searchTerm }
      return await this.findAll(searchParams)
    } catch (error) {
      console.error('Internal error searching CardFeatures:', error)
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }

  static async findByTech(tech: string, params: CardFeatureQueryParams = {}): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const techParams = { ...params, tech }
      return await this.findAll(techParams)
    } catch (error) {
      console.error('Internal error finding CardFeatures by tech:', error)
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }


  static async update(id: string, data: Partial<CreateCardFeatureRequest>): Promise<ModelResult<CardFeatureResponse>> {
    try {
      const existingCheck = await this.findById(id)
      if (!existingCheck.success) {
        return existingCheck
      }

      const updateData: CardFeatureUpdate = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: result, error } = await supabaseTyped
        .from(this.TABLE_NAME)
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
      console.error('Internal error updating CardFeature:', error)
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }


  static async delete(id: string): Promise<ModelResult<null>> {
    try {
      const existingCheck = await this.findById(id)
      if (!existingCheck.success) {
        return {
          success: false,
          error: existingCheck.error || 'Erro ao verificar CardFeature',
          statusCode: existingCheck.statusCode || 404
        }
      }

      const { error } = await supabaseTyped
        .from(this.TABLE_NAME)
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
      console.error('Internal error deleting CardFeature:', error)
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }


  static async getStats(): Promise<ModelResult<{
    total: number
    byTech: Record<string, number>
    byLanguage: Record<string, number>
    recentCount: number
  }>> {
    try {
      const { count: total, error: countError } = await supabaseTyped
        .from(this.TABLE_NAME)
        .select('*', { count: 'exact', head: true })

      if (countError) {
        return {
          success: false,
          error: countError.message,
          statusCode: 400
        }
      }

      const { data: techData, error: techError } = await supabaseTyped
        .from(this.TABLE_NAME)
        .select('tech')

      if (techError) {
        return {
          success: false,
          error: techError.message,
          statusCode: 400
        }
      }

      const { data: languageData, error: languageError } = await supabaseTyped
        .from(this.TABLE_NAME)
        .select('language')

      if (languageError) {
        return {
          success: false,
          error: languageError.message,
          statusCode: 400
        }
      }

      const SEVEN_DAYS_AGO = new Date()
      SEVEN_DAYS_AGO.setDate(SEVEN_DAYS_AGO.getDate() - 7)

      const { count: recentCount, error: recentError } = await supabaseTyped
        .from(this.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', SEVEN_DAYS_AGO.toISOString())

      if (recentError) {
        return {
          success: false,
          error: recentError.message,
          statusCode: 400
        }
      }

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
      console.error('Internal error fetching statistics:', error)
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }


  static async bulkCreate(items: CreateCardFeatureRequest[]): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const insertData: CardFeatureInsert[] = items.map(item => ({
        id: randomUUID(),
        title: item.title,
        tech: item.tech,
        language: item.language,
        description: item.description,
        screens: item.screens,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await supabaseTyped
        .from(this.TABLE_NAME)
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
      console.error('Internal error bulk creating CardFeatures:', error)
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }

  static async bulkDelete(ids: string[]): Promise<ModelResult<{ deletedCount: number }>> {
    try {
      const { error, count } = await supabaseTyped
        .from(this.TABLE_NAME)
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
      console.error('Internal error bulk deleting CardFeatures:', error)
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }
}