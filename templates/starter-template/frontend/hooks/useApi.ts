import { useState, useCallback } from 'react'
import { apiClient } from '@/services/apiClient'

interface UseApiState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false
  })

  const get = useCallback(async (endpoint: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await apiClient.get<T>(endpoint)
      setState({ data, error: null, isLoading: false })
      return data
    } catch (err: any) {
      setState({ data: null, error: err.message, isLoading: false })
      throw err
    }
  }, [])

  const post = useCallback(async (endpoint: string, body: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await apiClient.post<T>(endpoint, body)
      setState({ data, error: null, isLoading: false })
      return data
    } catch (err: any) {
      setState({ data: null, error: err.message, isLoading: false })
      throw err
    }
  }, [])

  const put = useCallback(async (endpoint: string, body: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await apiClient.put<T>(endpoint, body)
      setState({ data, error: null, isLoading: false })
      return data
    } catch (err: any) {
      setState({ data: null, error: err.message, isLoading: false })
      throw err
    }
  }, [])

  const remove = useCallback(async (endpoint: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await apiClient.delete<T>(endpoint)
      setState({ data, error: null, isLoading: false })
      return data
    } catch (err: any) {
      setState({ data: null, error: err.message, isLoading: false })
      throw err
    }
  }, [])

  return {
    ...state,
    get,
    post,
    put,
    delete: remove
  }
}
