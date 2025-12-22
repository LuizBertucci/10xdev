import { apiClient } from './apiClient'
import type {
  UserWithStats,
  UserDetail,
  SystemStats,
  UserRole,
  UserStatus,
  AdminUsersResponse,
  AdminUserResponse,
  AdminStatsResponse,
  AdminDeleteUserResponse,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
  TimePeriod,
  CardsHistoricalResponse,
  UsersHistoricalResponse
} from '@/types/admin'

/**
 * Admin Service - Serviço para gerenciamento administrativo
 *
 * IMPORTANTE: Todos os endpoints requerem autenticação e role de admin
 */

class AdminService {

  // ================================================
  // SYSTEM STATISTICS
  // ================================================

  /**
   * Busca estat\u00EDsticas gerais do sistema
   * GET /api/admin/stats
   */
  async getSystemStats() {
    const res = await apiClient.get<SystemStats>('/admin/stats')
    return res
  }

  // ================================================
  // USER MANAGEMENT
  // ================================================

  /**
   * Lista todos os usuários com suas estatísticas
   * GET /api/admin/users
   */
  async getAllUsers() {
    const res = await apiClient.get<UserWithStats[]>('/admin/users')
    return res
  }

  /**
   * Busca um usuário específico por ID com detalhes completos
   * GET /api/admin/users/:id
   */
  async getUserById(userId: string) {
    const res = await apiClient.get<UserDetail>(`/admin/users/${userId}`)
    return res
  }

  /**
   * Atualiza o role de um usuário
   * PUT /api/admin/users/:id/role
   */
  async updateUserRole(userId: string, role: UserRole) {
    const data: UpdateUserRoleRequest = { role }
    const res = await apiClient.put<UserWithStats>(`/admin/users/${userId}/role`, data)
    return res
  }

  /**
   * Atualiza o status de um usuário (ativo/inativo)
   * PUT /api/admin/users/:id/status
   */
  async updateUserStatus(userId: string, status: UserStatus) {
    const data: UpdateUserStatusRequest = { status }
    const res = await apiClient.put<UserWithStats>(`/admin/users/${userId}/status`, data)
    return res
  }

  /**
   * Deleta um usuário do sistema
   * DELETE /api/admin/users/:id
   *
   * ATENÇÃO: Esta operação é irreversível
   */
  async deleteUser(userId: string) {
    const res = await apiClient.delete<{ id: string }>(`/admin/users/${userId}`)
    return res
  }

  // ================================================
  // HISTORICAL DATA
  // ================================================

  /**
   * Busca dados históricos de criação de cards
   * GET /api/admin/history/cards?period=month&userId=123
   */
  async getCardsHistory(period: TimePeriod, userId?: string) {
    const params = new URLSearchParams({ period })
    if (userId) {
      params.append('userId', userId)
    }
    const res = await apiClient.get<CardsHistoricalResponse>(`/admin/history/cards?${params.toString()}`)
    return res
  }

  /**
   * Busca dados históricos de cadastro de usuários
   * GET /api/admin/history/users?period=month
   */
  async getUsersHistory(period: TimePeriod) {
    const res = await apiClient.get<UsersHistoricalResponse>(`/admin/history/users?period=${period}`)
    return res
  }

  // ================================================
  // BULK OPERATIONS (Future feature)
  // ================================================

  /**
   * Atualiza role de múltiplos usuários
   * (Não implementado ainda - futuro)
   */
  async bulkUpdateRole(userIds: string[], role: UserRole) {
    // TODO: Implementar endpoint de bulk no backend
    throw new Error('Bulk operations not implemented yet')
  }

  /**
   * Atualiza status de múltiplos usuários
   * (Não implementado ainda - futuro)
   */
  async bulkUpdateStatus(userIds: string[], status: UserStatus) {
    // TODO: Implementar endpoint de bulk no backend
    throw new Error('Bulk operations not implemented yet')
  }
}

// Instância singleton
export const adminService = new AdminService()

// Export do tipo para uso externo
export type { AdminService }
