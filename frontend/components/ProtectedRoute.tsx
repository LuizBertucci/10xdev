'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import LoadingPage from './LoadingPage'
import AccessDeniedCard from './AccessDeniedCard'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: 'admin' | 'user' | 'any'
  fallback?: React.ReactNode
}

export default function ProtectedRoute({
  children,
  requireRole = 'any',
  fallback,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the attempted URL for redirect after login
      const redirectUrl = `${pathname}${window.location.search}`
      router.replace(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
    }
  }, [isLoading, isAuthenticated, router, pathname])

  // Show loading state
  if (isLoading) {
    return fallback || <LoadingPage text="Verificando autenticação..." />
  }

  // Show loading while redirecting
  if (!isAuthenticated) {
    return fallback || <LoadingPage text="Redirecionando para login..." />
  }

  // Check role if required
  if (requireRole !== 'any' && user) {
    const userRole = user.role || 'user'
    const isEmailAdmin = user.email?.toLowerCase().includes('admin')
    const hasAdminAccess = userRole === 'admin' || isEmailAdmin

    if (requireRole === 'admin' && !hasAdminAccess) {
      return <AccessDeniedCard />
    }
  }

  // User is authenticated and authorized
  return <>{children}</>
}
