import { supabaseAdmin, executeQuery } from '@/database/supabase'
import {
  UserRow,
  UserResponse,
  ModelListResult,
  ModelResult
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

  static async listAllWithCardCounts(): Promise<ModelListResult<(UserResponse & {
    role: string | null
    status: string | null
    createdAt: string | null
    updatedAt: string | null
    cardCount: number
  })>> {
    try {
      const { data: users, count } = await executeQuery(
        supabaseAdmin
          .from('users')
          .select('id, email, name, avatar_url, role, status, created_at, updated_at', { count: 'exact' })
          .order('created_at', { ascending: false })
      )

      const base: Array<(UserResponse & {
        role: string | null
        status: string | null
        createdAt: string | null
        updatedAt: string | null
        cardCount: number
      })> = (users ?? []).map((row: any) => ({
        id: row.id,
        email: row.email,
        name: row.name ?? null,
        avatarUrl: row.avatar_url ?? null,
        role: row.role ?? null,
        status: row.status ?? null,
        createdAt: row.created_at ?? null,
        updatedAt: row.updated_at ?? null,
        cardCount: 0
      }))

      if (base.length === 0) {
        return { success: true, data: [], count: 0, statusCode: 200 }
      }

      // Contagem simples em memória (suficiente para volume atual; podemos migrar para SQL/RPC depois)
      const { data: cards } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('created_by')
      )

      const counts = new Map<string, number>()
      for (const c of cards ?? []) {
        const creator = (c as any)?.created_by as string | null
        if (!creator) continue
        counts.set(creator, (counts.get(creator) ?? 0) + 1)
      }

      const enriched = base.map((u) => ({ ...u, cardCount: counts.get(u.id) ?? 0 }))

      return {
        success: true,
        data: enriched,
        count: count || enriched.length,
        statusCode: 200
      }
    } catch (error: any) {
      console.error('Error listing users with stats:', error)
      return {
        success: false,
        error: error.message || 'Internal server error',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async setStatus(userId: string, status: 'active' | 'inactive'): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('users')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', userId)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      console.error('Error updating user status:', error)
      return {
        success: false,
        error: error.message || 'Internal server error',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async setRole(userId: string, role: 'admin' | 'user'): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('users')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('id', userId)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      console.error('Error updating user role:', error)
      return {
        success: false,
        error: error.message || 'Internal server error',
        statusCode: error.statusCode || 500
      }
    }
  }
}

