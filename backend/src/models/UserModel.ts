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

      // Enriquecer com avatar/nome do Auth quando a tabela users não tem
      const users = await Promise.all(
        data.map(async (row: UserRow) => {
          const user = this.transformToResponse(row)
          if (!user.avatarUrl || !user.name) {
            try {
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(row.id)
              if (authUser?.user?.user_metadata) {
                const meta = authUser.user.user_metadata
                const updates: Record<string, string> = {}

                if (!user.avatarUrl && meta.avatar_url) {
                  user.avatarUrl = meta.avatar_url
                  updates.avatar_url = meta.avatar_url
                }
                if (!user.name) {
                  const authName = meta.name || meta.full_name || null
                  if (authName) {
                    user.name = authName
                    updates.name = authName
                  }
                }

                // Sincronizar na tabela users para próximas buscas
                if (Object.keys(updates).length > 0) {
                  updates.updated_at = new Date().toISOString()
                  void Promise.resolve(
                    supabaseAdmin
                      .from('users')
                      .update(updates)
                      .eq('id', row.id)
                  ).catch(() => {})
                }
              }
            } catch {
              // Ignorar erro de auth, manter dados da tabela
            }
          }
          return user
        })
      )

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

      // Usar RPC function para contagem eficiente (escalável até 1M+ cards)
      // Fallback para query client-side se RPC não existir
      const counts = new Map<string, number>()

      try {
        // Tentar usar RPC function (mais eficiente)
        const { data: rpcCounts } = await executeQuery(
          supabaseAdmin.rpc('get_user_card_counts')
        )

        if (rpcCounts && Array.isArray(rpcCounts)) {
          for (const row of rpcCounts) {
            counts.set(row.user_id, Number(row.card_count) || 0)
          }
        }
      } catch (rpcError: any) {
        // Fallback: contagem client-side se RPC não existir
        console.warn('RPC get_user_card_counts não encontrada, usando fallback client-side')
        const { data: cards } = await executeQuery(
          supabaseAdmin
            .from('card_features')
            .select('created_by')
        )

        for (const c of cards ?? []) {
          const creator = (c as any)?.created_by as string | null
          if (!creator) continue
          counts.set(creator, (counts.get(creator) ?? 0) + 1)
        }
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
      const { data } = await executeQuery(
        supabaseAdmin
          .from('users')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
      )

      // Verify that a row was actually affected
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return {
          success: false,
          error: 'User not found',
          statusCode: 404
        }
      }

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
      const { data } = await executeQuery(
        supabaseAdmin
          .from('users')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
      )

      // Verify that a row was actually affected
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return {
          success: false,
          error: 'User not found',
          statusCode: 404
        }
      }

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

  static async anonymizeCards(userId: string): Promise<ModelResult<{ updatedCount: number }>> {
    try {
      // Contar antes de anonimizar (depois do update, a contagem seria 0)
      const { count } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', userId)
      )

      await executeQuery(
        supabaseAdmin
          .from('card_features')
          .update({ created_by: null, updated_at: new Date().toISOString() } as any)
          .eq('created_by', userId)
      )

      return { success: true, data: { updatedCount: count || 0 }, statusCode: 200 }
    } catch (error: any) {
      console.error('Error anonymizing cards:', error)
      return {
        success: false,
        error: error.message || 'Internal server error',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async cleanupUserRefs(userId: string): Promise<ModelResult<null>> {
    try {
      // Remove shares destinados ao usuário.
      // Observação: algumas instalações usam `shared_with_user_ids` (jsonb) em `card_features`
      // e não possuem a tabela `card_shares`. Nesses casos, ignoramos a ausência da tabela.
      try {
        await executeQuery(
          supabaseAdmin
            .from('card_shares')
            .delete()
            .eq('shared_with_user_id', userId)
        )
      } catch (err: any) {
        const code = err?.code
        const msg = String(err?.message || '')
        const isMissingRelation = code === '42P01' || msg.includes('card_shares') || msg.includes('relation')
        if (!isMissingRelation) throw err
      }

      // Remove memberships do usuário em projetos
      await executeQuery(
        supabaseAdmin
          .from('project_members')
          .delete()
          .eq('user_id', userId)
      )

      // Remove registros onde ele adicionou cards em projetos
      await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .delete()
          .eq('added_by', userId)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      console.error('Error cleaning user references:', error)
      return {
        success: false,
        error: error.message || 'Internal server error',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async deleteProjectsByCreator(userId: string): Promise<ModelResult<{ deletedProjects: number }>> {
    try {
      const { data: projects } = await executeQuery(
        supabaseAdmin
          .from('projects')
          .select('id')
          .eq('created_by', userId)
      )

      const projectIds: string[] = (projects ?? []).map((p: any) => p.id).filter(Boolean)
      if (projectIds.length === 0) {
        return { success: true, data: { deletedProjects: 0 }, statusCode: 200 }
      }

      // Limpar dependências antes de remover projetos
      await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .delete()
          .in('project_id', projectIds)
      )
      await executeQuery(
        supabaseAdmin
          .from('project_members')
          .delete()
          .in('project_id', projectIds)
      )
      await executeQuery(
        supabaseAdmin
          .from('projects')
          .delete()
          .in('id', projectIds)
      )

      return { success: true, data: { deletedProjects: projectIds.length }, statusCode: 200 }
    } catch (error: any) {
      console.error('Error deleting projects by creator:', error)
      return {
        success: false,
        error: error.message || 'Internal server error',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async deleteProfileRow(userId: string): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId)
      )

      return { success: true, data: null, statusCode: 200 }
    } catch (error: any) {
      console.error('Error deleting user profile row:', error)
      return {
        success: false,
        error: error.message || 'Internal server error',
        statusCode: error.statusCode || 500
      }
    }
  }
}

