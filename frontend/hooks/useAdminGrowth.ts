import { useState, useEffect, useCallback } from 'react'
import { adminService } from '@/services/adminService'
import { toast } from 'sonner'
import type {
  TimePeriod,
  HistoricalDataPoint,
  CardsHistoricalResponse,
  UsersHistoricalResponse
} from '@/types/admin'

interface UseAdminGrowthReturn {
  cardsData: HistoricalDataPoint[]
  usersData: HistoricalDataPoint[]
  loading: boolean
  error: string | null
  fetchCardsHistory: (period: TimePeriod, userId?: string) => Promise<void>
  fetchUsersHistory: (period: TimePeriod) => Promise<void>
  refreshAll: () => Promise<void>
}

/**
 * Hook para gerenciar dados históricos de crescimento do sistema
 * Segue o padrão estabelecido pelo useAdmin hook
 */
export function useAdminGrowth(defaultPeriod: TimePeriod = 'month'): UseAdminGrowthReturn {
  const [cardsData, setCardsData] = useState<HistoricalDataPoint[]>([])
  const [usersData, setUsersData] = useState<HistoricalDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState<TimePeriod>(defaultPeriod)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)

  /**
   * Busca dados históricos de cards
   */
  const fetchCardsHistory = useCallback(async (period: TimePeriod, userId?: string) => {
    try {
      setLoading(true)
      setError(null)
      setCurrentPeriod(period)
      setCurrentUserId(userId)

      const response = await adminService.getCardsHistory(period, userId)

      if (response.success && response.data) {
        setCardsData(response.data.data || [])
      } else {
        throw new Error(response.error || 'Erro ao buscar dados de cards')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao buscar dados históricos de cards'
      setError(errorMessage)
      toast.error(errorMessage)
      setCardsData([])
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Busca dados históricos de usuários
   */
  const fetchUsersHistory = useCallback(async (period: TimePeriod) => {
    try {
      setLoading(true)
      setError(null)
      setCurrentPeriod(period)

      const response = await adminService.getUsersHistory(period)

      if (response.success && response.data) {
        setUsersData(response.data.data || [])
      } else {
        throw new Error(response.error || 'Erro ao buscar dados de usuários')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao buscar dados históricos de usuários'
      setError(errorMessage)
      toast.error(errorMessage)
      setUsersData([])
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Atualiza todos os dados
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchCardsHistory(currentPeriod, currentUserId),
      fetchUsersHistory(currentPeriod)
    ])
  }, [currentPeriod, currentUserId, fetchCardsHistory, fetchUsersHistory])

  // Carregar dados iniciais
  useEffect(() => {
    refreshAll()
  }, []) // Apenas na montagem

  return {
    cardsData,
    usersData,
    loading,
    error,
    fetchCardsHistory,
    fetchUsersHistory,
    refreshAll
  }
}
