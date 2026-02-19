import { supabaseAdmin, executeQuery, paginate } from '@/database/supabase'
import type { Example, CreateExampleRequest, UpdateExampleRequest, ExampleQueryParams } from '@/types'

export class ExampleModel {
  static async getAll(params: ExampleQueryParams = {}, userId?: string) {
    const { page = 1, limit = 10, search, sortBy = 'created_at', sortOrder = 'desc' } = params

    let query = supabaseAdmin
      .from('examples')
      .select('*', { count: 'exact' })

    if (userId) {
      query = query.eq('created_by', userId)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    query = paginate(query, page, limit)

    return executeQuery(query)
  }

  static async getById(id: string, userId?: string) {
    let query = supabaseAdmin
      .from('examples')
      .select('*')
      .eq('id', id)

    if (userId) {
      query = query.eq('created_by', userId)
    }

    return executeQuery(query.single())
  }

  static async create(data: CreateExampleRequest, userId: string) {
    const now = new Date().toISOString()
    const insertData = {
      ...data,
      created_by: userId,
      created_at: now,
      updated_at: now
    }

    return executeQuery(
      supabaseAdmin
        .from('examples')
        .insert(insertData)
        .select()
        .single()
    )
  }

  static async update(id: string, data: UpdateExampleRequest, userId: string) {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    }

    return executeQuery(
      supabaseAdmin
        .from('examples')
        .update(updateData)
        .eq('id', id)
        .eq('created_by', userId)
        .select()
        .single()
    )
  }

  static async delete(id: string, userId: string) {
    return executeQuery(
      supabaseAdmin
        .from('examples')
        .delete()
        .eq('id', id)
        .eq('created_by', userId)
    )
  }
}
