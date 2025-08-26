import { query } from '../database/postgres'
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
      screens: typeof row.screens === 'string' ? JSON.parse(row.screens) : row.screens,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
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

      const result = await query(`
        INSERT INTO ${this.TABLE_NAME} (id, title, tech, language, description, screens, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        insertData.id,
        insertData.title,
        insertData.tech,
        insertData.language,
        insertData.description,
        JSON.stringify(insertData.screens),
        insertData.created_at,
        insertData.updated_at
      ])

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Failed to create CardFeature',
          statusCode: 400
        }
      }

      const row = result.rows[0]
      return {
        success: true,
        data: this.transformToResponse(row),
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
      const result = await query(`
        SELECT * FROM ${this.TABLE_NAME}
        WHERE id = $1
      `, [id])

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'CardFeature not found',
          statusCode: 404
        }
      }

      const row = result.rows[0]
      return {
        success: true,
        data: this.transformToResponse(row),
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
      let whereClause = 'WHERE 1=1'
      const queryParams: any[] = []
      let paramIndex = 1

      if (params.tech && params.tech !== 'all') {
        whereClause += ` AND tech ILIKE $${paramIndex}`
        queryParams.push(`%${params.tech}%`)
        paramIndex++
      }

      if (params.language && params.language !== 'all') {
        whereClause += ` AND language ILIKE $${paramIndex}`
        queryParams.push(`%${params.language}%`)
        paramIndex++
      }

      if (params.search) {
        whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR tech ILIKE $${paramIndex})`
        queryParams.push(`%${params.search}%`)
        paramIndex++
      }

      const sortBy = params.sortBy || 'created_at'
      const sortOrder = params.sortOrder === 'asc' ? 'ASC' : 'DESC'
      
      let limitClause = ''
      if (params.page && params.limit) {
        const offset = (params.page - 1) * params.limit
        limitClause = ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
        queryParams.push(params.limit, offset)
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${this.TABLE_NAME}
        ${whereClause}
      `
      const countResult = await query(countQuery, queryParams.slice(0, paramIndex - 1))
      const totalCount = parseInt(countResult.rows[0].total)

      // Get data
      const dataQuery = `
        SELECT * FROM ${this.TABLE_NAME}
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        ${limitClause}
      `
      const dataResult = await query(dataQuery, queryParams)

      const transformedData = dataResult.rows.map(row => this.transformToResponse(row))

      return {
        success: true,
        data: transformedData,
        count: totalCount,
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

      const updateFields: string[] = []
      const queryParams: any[] = []
      let paramIndex = 1

      if (data.title !== undefined) {
        updateFields.push(`title = $${paramIndex}`)
        queryParams.push(data.title)
        paramIndex++
      }
      if (data.tech !== undefined) {
        updateFields.push(`tech = $${paramIndex}`)
        queryParams.push(data.tech)
        paramIndex++
      }
      if (data.language !== undefined) {
        updateFields.push(`language = $${paramIndex}`)
        queryParams.push(data.language)
        paramIndex++
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`)
        queryParams.push(data.description)
        paramIndex++
      }
      if (data.screens !== undefined) {
        updateFields.push(`screens = $${paramIndex}`)
        queryParams.push(JSON.stringify(data.screens))
        paramIndex++
      }

      updateFields.push(`updated_at = $${paramIndex}`)
      queryParams.push(new Date().toISOString())
      paramIndex++

      queryParams.push(id)

      const result = await query(`
        UPDATE ${this.TABLE_NAME}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, queryParams)

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Failed to update CardFeature',
          statusCode: 400
        }
      }

      const row = result.rows[0]
      return {
        success: true,
        data: this.transformToResponse(row),
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

      const result = await query(`
        DELETE FROM ${this.TABLE_NAME}
        WHERE id = $1
      `, [id])

      if (result.rowCount === 0) {
        return {
          success: false,
          error: 'CardFeature not found',
          statusCode: 404
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
      // Get total count
      const totalResult = await query(`
        SELECT COUNT(*) as total FROM ${this.TABLE_NAME}
      `)
      const total = parseInt(totalResult.rows[0].total)

      // Get tech stats
      const techResult = await query(`
        SELECT tech, COUNT(*) as count
        FROM ${this.TABLE_NAME}
        GROUP BY tech
      `)
      const byTech: Record<string, number> = {}
      techResult.rows.forEach(row => {
        byTech[row.tech] = parseInt(row.count)
      })

      // Get language stats
      const languageResult = await query(`
        SELECT language, COUNT(*) as count
        FROM ${this.TABLE_NAME}
        GROUP BY language
      `)
      const byLanguage: Record<string, number> = {}
      languageResult.rows.forEach(row => {
        byLanguage[row.language] = parseInt(row.count)
      })

      // Get recent count (last 7 days)
      const SEVEN_DAYS_AGO = new Date()
      SEVEN_DAYS_AGO.setDate(SEVEN_DAYS_AGO.getDate() - 7)

      const recentResult = await query(`
        SELECT COUNT(*) as recent
        FROM ${this.TABLE_NAME}
        WHERE created_at >= $1
      `, [SEVEN_DAYS_AGO.toISOString()])
      const recentCount = parseInt(recentResult.rows[0].recent)

      return {
        success: true,
        data: {
          total,
          byTech,
          byLanguage,
          recentCount
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

      const values = insertData.map((item, index) => {
        const baseIndex = index * 8
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`
      }).join(', ')

      const params: any[] = []
      insertData.forEach(item => {
        params.push(
          item.id,
          item.title,
          item.tech,
          item.language,
          item.description,
          JSON.stringify(item.screens),
          item.created_at,
          item.updated_at
        )
      })

      const result = await query(`
        INSERT INTO ${this.TABLE_NAME} (id, title, tech, language, description, screens, created_at, updated_at)
        VALUES ${values}
        RETURNING *
      `, params)

      const transformedData = result.rows.map(row => this.transformToResponse(row))

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
      const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ')
      
      const result = await query(`
        DELETE FROM ${this.TABLE_NAME}
        WHERE id IN (${placeholders})
      `, ids)

      return {
        success: true,
        data: { deletedCount: result.rowCount || 0 },
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