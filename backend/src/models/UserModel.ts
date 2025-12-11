import { supabaseAdmin, executeQuery } from '@/database/supabase'
import {
  UserRow,
  UserResponse,
  ModelListResult
} from '@/types/user'

export class UserModel {
  private static transformToResponse(row: UserRow): UserResponse {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url
    }
  }

  static async search(query: string, limit: number = 10): Promise<ModelListResult<UserResponse>> {
    try {
      // Search in public.users table
      // We use ilike for case-insensitive search on email or name
      const { data, count } = await executeQuery(
        supabaseAdmin
          .from('users')
          .select('*', { count: 'exact' })
          .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
          .limit(limit)
          .order('name', { ascending: true })
      )

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          count: 0,
          statusCode: 200
        }
      }

      const users = data.map((row: UserRow) => this.transformToResponse(row))

      return {
        success: true,
        data: users,
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      console.error('Error searching users:', error)
      return {
        success: false,
        error: error.message || 'Internal server error',
        statusCode: error.statusCode || 500
      }
    }
  }
}

