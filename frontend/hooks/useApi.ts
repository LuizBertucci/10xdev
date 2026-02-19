// ================================================
// GENERIC API HOOK - Base hook for API operations
// ================================================

import { useState, useCallback } from 'react'
import type { ApiResponse } from '@/services'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiOptions<T> {
  onSuccess?: (data: T | null) => void
  onError?: (error: string) => void
  retryAttempts?: number
  retryDelay?: number
}

export function useApi<T = unknown>(options: UseApiOptions<T> = {}) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const { onSuccess, onError, retryAttempts = 0, retryDelay = 1000 } = options

  const executeWithRetry = useCallback(async (
    apiCall: () => Promise<ApiResponse<T> | undefined>,
    attempts: number = 0
  ): Promise<T | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await apiCall()

      if (!response) {
        setState(prev => ({ ...prev, data: null, loading: false }))
        onSuccess?.(null)
        return null
      }

      if (response.success) {
        const responseData = (response.data ?? null) as T | null
        setState(prev => ({ ...prev, data: responseData, loading: false }))
        onSuccess?.(responseData)
        return responseData
      } else {
        throw new Error(response.error || 'Erro desconhecido')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na requisição'
      
      // Retry logic
      if (attempts < retryAttempts) {
        setTimeout(() => {
          executeWithRetry(apiCall, attempts + 1)
        }, retryDelay * (attempts + 1))
        return null
      }
      
      setState(prev => ({ ...prev, error: errorMessage, loading: false }))
      onError?.(errorMessage)
      return null
    }
  }, [onSuccess, onError, retryAttempts, retryDelay])

  const execute = useCallback(async (
    apiCall: () => Promise<ApiResponse<T> | undefined>
  ): Promise<T | null> => {
    return executeWithRetry(apiCall)
  }, [executeWithRetry])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    clearError,
    reset
  }
}

// Hook especializado para listas
export function useListApi<T = unknown>(options: UseApiOptions<T[]> = {}) {
  const [listState, setListState] = useState({
    count: 0,
    totalPages: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false
  })

  const api = useApi<T[]>(options)

  const executeList = useCallback(async (
    apiCall: () => Promise<ApiResponse<T[]> | undefined>
  ): Promise<T[] | null> => {
    const response = await api.execute(apiCall)
    
    // Se a resposta contém metadados de paginação
    if (api.data && response && typeof response === 'object' && 'data' in response) {
      const listResponse = response as unknown as ApiResponse<T[]> & {
        count?: number
        totalPages?: number
        currentPage?: number
        hasNextPage?: boolean
        hasPrevPage?: boolean
      }
      setListState({
        count: listResponse.count || 0,
        totalPages: listResponse.totalPages || 0,
        currentPage: listResponse.currentPage || 1,
        hasNextPage: listResponse.hasNextPage || false,
        hasPrevPage: listResponse.hasPrevPage || false
      })
      return listResponse.data || null
    }

    return response || null
  }, [api])

  return {
    ...api,
    ...listState,
    executeList
  }
}

// Hook para mutações (create, update, delete)
export function useMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: UseApiOptions<TData> = {}
) {
  const [state, setState] = useState({
    data: null as TData | null,
    loading: false,
    error: null as string | null
  })

  const { onSuccess, onError } = options

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await mutationFn(variables)
      
      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          data: response.data || null, 
          loading: false 
        }))
        onSuccess?.(response.data as TData | null)
        return response.data || null
      } else {
        throw new Error(response.error || 'Erro na mutação')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na mutação'
      setState(prev => ({ ...prev, error: errorMessage, loading: false }))
      onError?.(errorMessage)
      return null
    }
  }, [mutationFn, onSuccess, onError])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    mutate,
    reset,
    clearError
  }
}