// ================================================
// GENERIC API HOOK - Base hook for API operations
// ================================================

import { useState, useCallback } from 'react'
import type { ApiResponse, ApiError } from '@/services'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
  retryAttempts?: number
  retryDelay?: number
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const { onSuccess, onError, retryAttempts = 0, retryDelay = 1000 } = options

  const executeWithRetry = useCallback(async (
    apiCall: () => Promise<ApiResponse<T>>,
    attempts: number = 0
  ): Promise<T | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await apiCall()
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, data: response.data!, loading: false }))
        onSuccess?.(response.data)
        return response.data
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
    apiCall: () => Promise<ApiResponse<T>>
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
export function useListApi<T = any>(options: UseApiOptions = {}) {
  const [listState, setListState] = useState({
    count: 0,
    totalPages: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false
  })

  const api = useApi<T[]>(options)

  const executeList = useCallback(async (
    apiCall: () => Promise<ApiResponse<any>>
  ): Promise<T[] | null> => {
    const response = await api.execute(apiCall)
    
    // Se a resposta contém metadados de paginação
    if (response && typeof response === 'object' && 'data' in response) {
      const listResponse = response as any
      setListState({
        count: listResponse.count || 0,
        totalPages: listResponse.totalPages || 0,
        currentPage: listResponse.currentPage || 1,
        hasNextPage: listResponse.hasNextPage || false,
        hasPrevPage: listResponse.hasPrevPage || false
      })
      return listResponse.data || null
    }
    
    return response
  }, [api])

  return {
    ...api,
    ...listState,
    executeList
  }
}

// Hook para mutações (create, update, delete)
export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: UseApiOptions = {}
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
        onSuccess?.(response.data)
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