import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/database/supabase'
import type {
  TemplateRow,
  TemplateInsert,
  TemplateUpdate,
  TemplateResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateQueryParams,
  ModelResult,
  ModelListResult
} from '@/types/template'

export class TemplateModel {
  private static toResponse(row: TemplateRow): TemplateResponse {
    const response: TemplateResponse = {
      id: row.id,
      name: row.name,
      zipPath: row.zip_path,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }

    if (row.description !== null && row.description !== undefined) {
      response.description = row.description
    }
    if (row.version !== null && row.version !== undefined) {
      response.version = row.version
    }
    if (row.tags !== null && row.tags !== undefined) {
      response.tags = row.tags
    }
    if (row.zip_url !== null && row.zip_url !== undefined) {
      response.zipUrl = row.zip_url
    }
    if (row.created_by !== null && row.created_by !== undefined) {
      response.createdBy = row.created_by
    }

    return response
  }

  static async list(params: TemplateQueryParams = {}): Promise<ModelListResult<TemplateResponse>> {
    try {
      let query = supabaseAdmin
        .from('project_templates')
        .select('*', { count: 'exact' })

      if (params.isActive !== undefined) {
        query = query.eq('is_active', params.isActive)
      }

      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`)
      }

      const sortBy = params.sortBy || 'created_at'
      const sortOrder = params.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      if (params.page && params.limit) {
        const from = (params.page - 1) * params.limit
        const to = from + params.limit - 1
        query = query.range(from, to)
      }

      const { data, error, count } = await query

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      const templates = Array.isArray(data) ? data.map((r) => this.toResponse(r as TemplateRow)) : []
      return { success: true, data: templates, count: count ?? 0, statusCode: 200 }
    } catch (e) {
      console.error('Erro no TemplateModel.list:', e)
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async getById(id: string): Promise<ModelResult<TemplateResponse>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('project_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        const isNotFound = error.code === 'PGRST116' || error.message.includes('PGRST116')
        return { success: false, error: isNotFound ? 'Template não encontrado' : error.message, statusCode: isNotFound ? 404 : 400 }
      }

      return { success: true, data: this.toResponse(data as TemplateRow), statusCode: 200 }
    } catch {
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async create(payload: CreateTemplateRequest): Promise<ModelResult<TemplateResponse>> {
    try {
      const insertData: TemplateInsert = {
        id: randomUUID(),
        name: payload.name,
        zip_path: payload.zipPath,
        is_active: payload.isActive ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (payload.description !== undefined) {
        insertData.description = payload.description
      }
      if (payload.version !== undefined) {
        insertData.version = payload.version
      }
      if (payload.tags !== undefined) {
        insertData.tags = payload.tags
      }
      if (payload.zipUrl !== undefined) {
        insertData.zip_url = payload.zipUrl
      }
      if (payload.createdBy !== undefined) {
        insertData.created_by = payload.createdBy
      }

      const { data, error } = await supabaseAdmin
        .from('project_templates')
        .insert(insertData)
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message, statusCode: 400 }
      }

      return { success: true, data: this.toResponse(data as TemplateRow), statusCode: 201 }
    } catch (e) {
      console.error('Erro no TemplateModel.create:', e)
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }

  static async update(id: string, payload: UpdateTemplateRequest): Promise<ModelResult<TemplateResponse>> {
    try {
      const updateData: TemplateUpdate = {
        updated_at: new Date().toISOString()
      }

      if (payload.name !== undefined) updateData.name = payload.name
      if (payload.description !== undefined) updateData.description = payload.description
      if (payload.version !== undefined) updateData.version = payload.version
      if (payload.tags !== undefined) updateData.tags = payload.tags
      if (payload.zipPath !== undefined) updateData.zip_path = payload.zipPath
      if (payload.zipUrl !== undefined) updateData.zip_url = payload.zipUrl
      if (payload.isActive !== undefined) updateData.is_active = payload.isActive

      const { data, error } = await supabaseAdmin
        .from('project_templates')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        const isNotFound = error.code === 'PGRST116' || error.message.includes('PGRST116')
        return { success: false, error: isNotFound ? 'Template não encontrado' : error.message, statusCode: isNotFound ? 404 : 400 }
      }

      return { success: true, data: this.toResponse(data as TemplateRow), statusCode: 200 }
    } catch (e) {
      console.error('Erro no TemplateModel.update:', e)
      return { success: false, error: 'Erro interno do servidor', statusCode: 500 }
    }
  }
}
