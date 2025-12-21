import { useState, useCallback, useEffect } from 'react'
import { adminService } from '@/services/adminService'
import { useToast } from './use-toast'
import type {
  UserWithStats,
  UserDetail,
  SystemStats,
  UserRole,
  UserStatus,
  UseAdminReturn
} from '@/types/admin'

interface AdminState {
  users: UserWithStats[]
  stats: SystemStats | null
  selectedUser: UserDetail | null
  loading: boolean
  loadingStats: boolean
  loadingUser: boolean
  updating: boolean
  deleting: boolean
  error: string | null
}

/**
 * Hook para gerenciar o painel administrativo
 *
 * Fornece funcionalidades para:
 * - Listar todos os usuários com estatísticas
 * - Visualizar detalhes de um usuário específico
 * - Atualizar role de usuários
 * - Ativar/desativar usuários
 * - Deletar usuários
 * - Visualizar estatísticas gerais do sistema
 */
export function useAdmin(): UseAdminReturn {
  const { toast } = useToast()

  const [state, setState] = useState<AdminState>({
    users: [],
    stats: null,
    selectedUser: null,
    loading: false,
    loadingStats: false,
    loadingUser: false,
    updating: false,
    deleting: false,
    error: null
  })

  // ================================================
  // FETCH OPERATIONS
  // ================================================

  /**
   * Busca lista de todos os usuários com suas estatísticas
   */
  const fetchUsers = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await adminService.getAllUsers()

      if (response && response.success && response.data) {
        setState(prev => ({
          ...prev,
          users: response.data || [],
          loading: false
        }))
      } else {
        throw new Error(response?.error || 'Erro ao carregar usuários')
      }
    } catch (error: any) {
      const errorMessage = error?.error || error?.message || 'Erro ao carregar usuários'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }))

      toast({
        title: 'Erro ao carregar usuários',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [toast])

  /**
   * Busca estatísticas gerais do sistema
   */
  const fetchStats = useCallback(async () => {
    setState(prev => ({ ...prev, loadingStats: true, error: null }))

    try {
      const response = await adminService.getSystemStats()

      if (response && response.success && response.data) {
        setState(prev => ({
          ...prev,
          stats: response.data || null,
          loadingStats: false
        }))
      } else {
        throw new Error(response?.error || 'Erro ao carregar estatísticas')
      }
    } catch (error: any) {
      const errorMessage = error?.error || error?.message || 'Erro ao carregar estatísticas'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loadingStats: false
      }))

      toast({
        title: 'Erro ao carregar estatísticas',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [toast])

  /**
   * Busca detalhes de um usuário específico
   */
  const fetchUserById = useCallback(async (userId: string) => {
    setState(prev => ({ ...prev, loadingUser: true, error: null }))

    try {
      const response = await adminService.getUserById(userId)

      if (response && response.success && response.data) {
        setState(prev => ({
          ...prev,
          selectedUser: response.data as UserDetail,
          loadingUser: false
        }))
      } else {
        throw new Error(response?.error || 'Erro ao carregar detalhes do usuário')
      }
    } catch (error: any) {
      const errorMessage = error?.error || error?.message || 'Erro ao carregar usuário'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loadingUser: false
      }))

      toast({
        title: 'Erro ao carregar usuário',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [toast])

  // ================================================
  // UPDATE OPERATIONS
  // ================================================

  /**
   * Atualiza o role de um usuário
   */
  const updateUserRole = useCallback(async (userId: string, role: UserRole) => {
    setState(prev => ({ ...prev, updating: true, error: null }))

    try {
      const response = await adminService.updateUserRole(userId, role)

      if (response && response.success) {
        // Atualizar a lista de usuários
        setState(prev => ({
          ...prev,
          users: prev.users.map(user =>
            user.id === userId ? { ...user, role } : user
          ),
          updating: false
        }))

        toast({
          title: 'Role atualizado com sucesso',
          description: `O role do usuário foi alterado para ${role}`,
          variant: 'default'
        })

        // Recarregar lista completa para garantir dados atualizados
        await fetchUsers()
      } else {
        throw new Error(response?.error || 'Erro ao atualizar role')
      }
    } catch (error: any) {
      const errorMessage = error?.error || error?.message || 'Erro ao atualizar role'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        updating: false
      }))

      toast({
        title: 'Erro ao atualizar role',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [toast, fetchUsers])

  /**
   * Atualiza o status de um usuário (ativo/inativo)
   */
  const updateUserStatus = useCallback(async (userId: string, status: UserStatus) => {
    setState(prev => ({ ...prev, updating: true, error: null }))

    try {
      const response = await adminService.updateUserStatus(userId, status)

      if (response && response.success) {
        // Atualizar a lista de usuários
        setState(prev => ({
          ...prev,
          users: prev.users.map(user =>
            user.id === userId ? { ...user, status } : user
          ),
          updating: false
        }))

        const statusLabel = status === 'active' ? 'ativado' : 'desativado'
        toast({
          title: 'Status atualizado com sucesso',
          description: `O usuário foi ${statusLabel}`,
          variant: 'default'
        })

        // Recarregar lista completa
        await fetchUsers()
      } else {
        throw new Error(response?.error || 'Erro ao atualizar status')
      }
    } catch (error: any) {
      const errorMessage = error?.error || error?.message || 'Erro ao atualizar status'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        updating: false
      }))

      toast({
        title: 'Erro ao atualizar status',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [toast, fetchUsers])

  // ================================================
  // DELETE OPERATIONS
  // ================================================

  /**
   * Deleta um usuário do sistema
   * ATENÇÃO: Esta operação é irreversível
   */
  const deleteUser = useCallback(async (userId: string) => {
    setState(prev => ({ ...prev, deleting: true, error: null }))

    try {
      const response = await adminService.deleteUser(userId)

      if (response && response.success) {
        // Remover usuário da lista
        setState(prev => ({
          ...prev,
          users: prev.users.filter(user => user.id !== userId),
          deleting: false
        }))

        toast({
          title: 'Usuário deletado com sucesso',
          description: 'O usuário foi removido do sistema',
          variant: 'default'
        })

        // Recarregar estatísticas
        await fetchStats()
      } else {
        throw new Error(response?.error || 'Erro ao deletar usuário')
      }
    } catch (error: any) {
      const errorMessage = error?.error || error?.message || 'Erro ao deletar usuário'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        deleting: false
      }))

      toast({
        title: 'Erro ao deletar usuário',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [toast, fetchStats])

  // ================================================
  // UTILITY FUNCTIONS
  // ================================================

  /**
   * Limpa mensagem de erro
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  /**
   * Recarrega todos os dados (usuários + estatísticas)
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchUsers(), fetchStats()])
  }, [fetchUsers, fetchStats])

  // ================================================
  // INITIAL LOAD
  // ================================================

  // Carregar dados iniciais ao montar o componente
  useEffect(() => {
    refreshAll()
  }, []) // Executar apenas uma vez ao montar

  // ================================================
  // RETURN
  // ================================================

  return {
    // Data
    users: state.users,
    stats: state.stats,
    selectedUser: state.selectedUser,

    // Loading states
    loading: state.loading,
    loadingStats: state.loadingStats,
    loadingUser: state.loadingUser,
    updating: state.updating,
    deleting: state.deleting,

    // Error states
    error: state.error,

    // Actions
    fetchUsers,
    fetchStats,
    fetchUserById,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    clearError,
    refreshAll
  }
}
