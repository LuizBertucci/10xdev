import { supabaseAdmin, executeQuery } from '@/database/supabase'
import type {
  UserRow,
  UserWithStats,
  SystemStats,
  UserRole,
  UserStatus,
  AdminUserResult,
  AdminUsersResult,
  AdminStatsResult,
  AdminDeleteResult,
  UserDetail,
  TimePeriod,
  HistoricalDataPoint,
  CardsHistoricalResult,
  UsersHistoricalResult
} from '@/types/admin'

export class AdminModel {
  // ================================================
  // PRIVATE HELPERS
  // ================================================

  private static transformToUserWithStats(row: any): UserWithStats {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      role: row.role || 'user',
      status: row.status || 'active',
      team_id: row.team_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      cards_created: parseInt(row.cards_created) || 0,
      projects_created: parseInt(row.projects_created) || 0,
      projects_participating: parseInt(row.projects_participating) || 0
    }
  }

  // ================================================
  // USER MANAGEMENT
  // ================================================

  /**
   * Lista todos os usuários do sistema com suas estatísticas
   */
  static async getAllUsers(): Promise<AdminUsersResult> {
    try {
      // Query usando supabaseAdmin para ter acesso total
      const query = supabaseAdmin
        .from('users')
        .select(`
          *,
          cards_created:card_features(count),
          projects_created:projects!projects_created_by_fkey(count),
          projects_participating:project_members(count)
        `)
        .order('created_at', { ascending: false })

      const result = await executeQuery(query)

      if (!result.data) {
        return {
          success: false,
          error: 'Erro ao buscar usuários',
          statusCode: 500
        }
      }

      // Transformar dados agregados
      const users = result.data.map((row: any) => ({
        ...row,
        cards_created: row.cards_created?.[0]?.count || 0,
        projects_created: row.projects_created?.[0]?.count || 0,
        projects_participating: row.projects_participating?.[0]?.count || 0
      }))

      const transformedUsers = users.map(this.transformToUserWithStats)

      return {
        success: true,
        data: transformedUsers,
        count: transformedUsers.length
      }
    } catch (error: any) {
      console.error('Erro ao buscar todos os usuários:', error)
      return {
        success: false,
        error: error.message || 'Erro ao buscar usuários',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca um usuário específico por ID com estatísticas detalhadas
   */
  static async getUserById(userId: string): Promise<AdminUserResult> {
    try {
      // Buscar dados do usuário
      const userQuery = supabaseAdmin
        .from('users')
        .select(`
          *,
          cards_created:card_features(count),
          projects_created:projects!projects_created_by_fkey(count),
          projects_participating:project_members(count)
        `)
        .eq('id', userId)
        .single()

      const userResult = await executeQuery(userQuery)

      if (!userResult.data) {
        return {
          success: false,
          error: 'Usuário não encontrado',
          statusCode: 404
        }
      }

      const userData = {
        ...userResult.data,
        cards_created: userResult.data.cards_created?.[0]?.count || 0,
        projects_created: userResult.data.projects_created?.[0]?.count || 0,
        projects_participating: userResult.data.projects_participating?.[0]?.count || 0
      }

      const transformedUser = this.transformToUserWithStats(userData)

      return {
        success: true,
        data: transformedUser
      }
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error)
      return {
        success: false,
        error: error.message || 'Erro ao buscar usuário',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Atualiza o role de um usuário
   */
  static async updateUserRole(userId: string, role: UserRole): Promise<AdminUserResult> {
    try {
      const query = supabaseAdmin
        .from('users')
        .update({
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      const result = await executeQuery(query)

      if (!result.data) {
        return {
          success: false,
          error: 'Erro ao atualizar role do usuário',
          statusCode: 500
        }
      }

      // Buscar dados completos atualizados
      return this.getUserById(userId)
    } catch (error: any) {
      console.error('Erro ao atualizar role:', error)
      return {
        success: false,
        error: error.message || 'Erro ao atualizar role',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Atualiza o status de um usuário (ativo/inativo)
   */
  static async updateUserStatus(userId: string, status: UserStatus): Promise<AdminUserResult> {
    try {
      const query = supabaseAdmin
        .from('users')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      const result = await executeQuery(query)

      if (!result.data) {
        return {
          success: false,
          error: 'Erro ao atualizar status do usuário',
          statusCode: 500
        }
      }

      // Buscar dados completos atualizados
      return this.getUserById(userId)
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error)
      return {
        success: false,
        error: error.message || 'Erro ao atualizar status',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Deleta um usuário do sistema
   * ATENÇÃO: Esta operação é irreversível
   */
  static async deleteUser(userId: string): Promise<AdminDeleteResult> {
    try {
      // Verificar se o usuário existe
      const userCheck = await this.getUserById(userId)
      if (!userCheck.success) {
        return {
          success: false,
          error: 'Usuário não encontrado',
          statusCode: 404
        }
      }

      // Deletar o usuário (cascade vai cuidar das relações)
      const query = supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId)

      await executeQuery(query)

      return {
        success: true,
        data: { id: userId }
      }
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error)
      return {
        success: false,
        error: error.message || 'Erro ao deletar usuário',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // SYSTEM STATISTICS
  // ================================================

  /**
   * Retorna estatísticas gerais do sistema
   */
  static async getSystemStats(): Promise<AdminStatsResult> {
    try {
      // Buscar estatísticas em paralelo
      const [
        usersResult,
        cardsResult,
        projectsResult
      ] = await Promise.all([
        // Total de usuários e breakdown por status/role
        executeQuery(
          supabaseAdmin
            .from('users')
            .select('id, status, role', { count: 'exact' })
        ),
        // Total de cards e cards recentes
        executeQuery(
          supabaseAdmin
            .from('card_features')
            .select('id, created_at', { count: 'exact' })
        ),
        // Total de projetos
        executeQuery(
          supabaseAdmin
            .from('projects')
            .select('id', { count: 'exact' })
        )
      ])

      // Processar contagens de usuários
      const users = usersResult.data || []
      const totalUsers = usersResult.count || 0
      const activeUsers = users.filter((u: any) => u.status === 'active').length
      const inactiveUsers = users.filter((u: any) => u.status === 'inactive').length
      const adminUsers = users.filter((u: any) => u.role === 'admin').length

      // Processar contagens de cards
      const cards = cardsResult.data || []
      const totalCards = cardsResult.count || 0

      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const cardsThisWeek = cards.filter((c: any) =>
        new Date(c.created_at) >= oneWeekAgo
      ).length

      const cardsThisMonth = cards.filter((c: any) =>
        new Date(c.created_at) >= oneMonthAgo
      ).length

      const usersThisWeek = users.filter((u: any) =>
        new Date(u.created_at) >= oneWeekAgo
      ).length

      const usersThisMonth = users.filter((u: any) =>
        new Date(u.created_at) >= oneMonthAgo
      ).length

      // Total de projetos
      const totalProjects = projectsResult.count || 0

      const stats: SystemStats = {
        total_users: totalUsers,
        active_users: activeUsers,
        inactive_users: inactiveUsers,
        admin_users: adminUsers,
        total_cards: totalCards,
        total_projects: totalProjects,
        cards_this_week: cardsThisWeek,
        cards_this_month: cardsThisMonth,
        users_this_week: usersThisWeek,
        users_this_month: usersThisMonth
      }

      return {
        success: true,
        data: stats
      }
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas do sistema:', error)
      return {
        success: false,
        error: error.message || 'Erro ao buscar estatísticas',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca detalhes completos de um usuário incluindo cards e projetos recentes
   */
  static async getUserDetail(userId: string): Promise<AdminUserResult> {
    try {
      // Buscar dados básicos do usuário
      const userResult = await this.getUserById(userId)
      if (!userResult.success) {
        return userResult
      }

      // Buscar cards recentes
      const cardsQuery = supabaseAdmin
        .from('card_features')
        .select('id, title, tech, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      const cardsResult = await executeQuery(cardsQuery)

      // Buscar projetos recentes
      const projectsQuery = supabaseAdmin
        .from('project_members')
        .select(`
          project_id,
          role,
          created_at,
          projects:projects(id, name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      const projectsResult = await executeQuery(projectsQuery)

      const userDetail: UserDetail = {
        ...userResult.data!,
        recent_cards: cardsResult.data || [],
        recent_projects: (projectsResult.data || []).map((pm: any) => ({
          id: pm.projects?.id,
          name: pm.projects?.name,
          role: pm.role,
          created_at: pm.created_at
        }))
      }

      return {
        success: true,
        data: userDetail as any // Cast pois UserDetail extends UserWithStats
      }
    } catch (error: any) {
      console.error('Erro ao buscar detalhes do usuário:', error)
      return {
        success: false,
        error: error.message || 'Erro ao buscar detalhes',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // HISTORICAL DATA
  // ================================================

  /**
   * Helper para determinar o truncamento de data baseado no período
   */
  private static getDateTruncate(period: TimePeriod): string {
    switch (period) {
      case 'day':
        return 'hour'
      case 'week':
        return 'day'
      case 'month':
        return 'day'
      case 'year':
        return 'month'
      case 'all':
        return 'month'
      default:
        return 'day'
    }
  }

  /**
   * Helper para calcular a data de início baseado no período
   */
  private static getStartDate(period: TimePeriod): Date | null {
    const now = new Date()

    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      case 'all':
        return null // Sem filtro de data
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
  }

  /**
   * Busca dados históricos de criação de cards
   */
  static async getCardsHistoricalData(
    period: TimePeriod,
    userId?: string
  ): Promise<CardsHistoricalResult> {
    try {
      const truncate = this.getDateTruncate(period)
      const startDate = this.getStartDate(period)

      // Query com agrupamento por data
      let query = supabaseAdmin
        .from('card_features')
        .select('created_at')

      // Aplicar filtro de data se não for 'all'
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString())
      }

      // Aplicar filtro de usuário se fornecido
      if (userId) {
        query = query.eq('created_by', userId)
      }

      const result = await executeQuery(query)

      if (!result.data) {
        return {
          success: true,
          data: []
        }
      }

      // Agrupar dados manualmente por período
      const grouped = new Map<string, number>()

      result.data.forEach((card: any) => {
        const date = new Date(card.created_at)
        let key: string

        switch (truncate) {
          case 'hour':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
            break
          case 'day':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            break
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            break
          default:
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        }

        grouped.set(key, (grouped.get(key) || 0) + 1)
      })

      // Converter Map para array e ordenar
      const data: HistoricalDataPoint[] = Array.from(grouped.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return {
        success: true,
        data
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados históricos de cards:', error)
      return {
        success: false,
        error: error.message || 'Erro ao buscar dados históricos',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca dados históricos de cadastro de usuários
   */
  static async getUsersHistoricalData(
    period: TimePeriod
  ): Promise<UsersHistoricalResult> {
    try {
      const truncate = this.getDateTruncate(period)
      const startDate = this.getStartDate(period)

      // Query com agrupamento por data
      let query = supabaseAdmin
        .from('users')
        .select('created_at')

      // Aplicar filtro de data se não for 'all'
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString())
      }

      const result = await executeQuery(query)

      if (!result.data) {
        return {
          success: true,
          data: []
        }
      }

      // Agrupar dados manualmente por período
      const grouped = new Map<string, number>()

      result.data.forEach((user: any) => {
        const date = new Date(user.created_at)
        let key: string

        switch (truncate) {
          case 'hour':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
            break
          case 'day':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            break
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            break
          default:
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        }

        grouped.set(key, (grouped.get(key) || 0) + 1)
      })

      // Converter Map para array e ordenar
      const data: HistoricalDataPoint[] = Array.from(grouped.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return {
        success: true,
        data
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados históricos de usuários:', error)
      return {
        success: false,
        error: error.message || 'Erro ao buscar dados históricos',
        statusCode: error.statusCode || 500
      }
    }
  }
}
