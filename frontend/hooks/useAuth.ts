import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/services'
import type { 
  User, 
  AuthTokens, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse 
} from '@/lib/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null
  })

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false }))
  }

  const setUser = (user: User | null) => {
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: !!user,
      loading: false,
      error: null
    }))
  }

  const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials)
      
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data
        
        // Store tokens
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        
        // Set auth header
        apiClient.setHeader('Authorization', `Bearer ${accessToken}`)
        
        // Update state
        setUser(user)
        return true
      } else {
        throw new Error(response.error || 'Login failed')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
      return false
    }
  }, [])

  const register = useCallback(async (userData: RegisterRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', userData)
      
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data
        
        // Store tokens
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        
        // Set auth header
        apiClient.setHeader('Authorization', `Bearer ${accessToken}`)
        
        // Update state
        setUser(user)
        return true
      } else {
        throw new Error(response.error || 'Registration failed')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed')
      return false
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true)
    
    try {
      // Try to logout on server
      await apiClient.post('/auth/logout')
    } catch (error) {
      // Continue with client logout even if server logout fails
    } finally {
      // Clear local storage
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      
      // Remove auth header
      apiClient.removeHeader('Authorization')
      
      // Clear state
      setUser(null)
    }
  }, [])

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return false
    
    try {
      const response = await apiClient.post<AuthTokens>('/auth/refresh', {
        refreshToken
      })
      
      if (response.success && response.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data
        
        // Update tokens
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', newRefreshToken)
        
        // Update auth header
        apiClient.setHeader('Authorization', `Bearer ${accessToken}`)
        
        return true
      } else {
        throw new Error('Token refresh failed')
      }
    } catch (error) {
      // If refresh fails, logout user
      await logout()
      return false
    }
  }, [logout])

  const checkAuth = useCallback(async (): Promise<void> => {
    const accessToken = localStorage.getItem('access_token')
    
    if (!accessToken) {
      setUser(null)
      return
    }

    // Set auth header
    apiClient.setHeader('Authorization', `Bearer ${accessToken}`)
    
    try {
      // Verify token with server
      const response = await apiClient.get<User>('/auth/me')
      
      if (response.success && response.data) {
        setUser(response.data)
      } else {
        throw new Error('Token invalid')
      }
    } catch (error) {
      // Token might be expired, try to refresh
      const refreshSuccess = await refreshToken()
      if (!refreshSuccess) {
        setError('Session expired. Please login again.')
      }
    }
  }, [refreshToken])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Initialize auth state on mount
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    clearError
  }
}

export default useAuth