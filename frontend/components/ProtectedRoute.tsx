'use client'

import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getDefaultRoute } from '@/utils/routes'
import { LoadingPage } from '@/components/ui/loading-spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirecionar para login com query param redirect para voltar após login
      // Preservar query params se existirem (ex: ?tab=home)
      const safePathname = pathname ?? '/'
      const searchQuery = searchParams?.toString() ?? ''
      const currentPath = safePathname === '/' && searchQuery
        ? `/?${searchQuery}`
        : safePathname
      
      const redirectUrl = currentPath !== '/' 
        ? `?redirect=${encodeURIComponent(currentPath)}` 
        : '?redirect=' + encodeURIComponent(getDefaultRoute())
      
      // Usar replace ao invés de push para não criar entrada no histórico
      router.replace(`/login${redirectUrl}`)
    }
  }, [isAuthenticated, isLoading, router, pathname, searchParams])

  // Mostrar loading durante verificação
  if (isLoading) {
    return <LoadingPage />
  }

  // Não renderizar children se não autenticado (redirecionamento está em andamento)
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

