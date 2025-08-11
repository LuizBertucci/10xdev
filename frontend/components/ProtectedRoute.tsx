'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: 'admin' | 'user'
  redirectTo?: string
  fallback?: React.ReactNode
}

export default function ProtectedRoute({ 
  children, 
  requireRole, 
  redirectTo = '/login',
  fallback
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(redirectTo)
        return
      }

      if (requireRole && user?.role !== requireRole) {
        // Redirect to unauthorized page or home
        router.push('/')
        return
      }
    }
  }, [isAuthenticated, isLoading, user, requireRole, redirectTo, router])

  // Show loading while checking auth
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Don't render if role requirement not met
  if (requireRole && user?.role !== requireRole) {
    return null
  }

  return <>{children}</>
}