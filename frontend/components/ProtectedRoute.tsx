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
  const hasOAuthFlags = Boolean(
    searchParams?.get('gitsync') ||
    searchParams?.get('installation_id') ||
    searchParams?.get('oauth_return')
  )
  const OAUTH_AUTH_GRACE_MS = 5000

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (hasOAuthFlags) {
        // Durante retorno OAuth, aguarda alguns segundos antes de mandar para login.
        // Isso evita redirecionamento prematuro enquanto a sessão estabiliza.
        const timeout = setTimeout(() => {
          const safePathname = pathname ?? '/'
          const searchQuery = searchParams?.toString() ?? ''
          const currentPath = safePathname === '/' && searchQuery
            ? `/?${searchQuery}`
            : safePathname
          const redirectUrl = currentPath !== '/'
            ? `?redirect=${encodeURIComponent(currentPath)}`
            : '?redirect=' + encodeURIComponent(getDefaultRoute())
          router.replace(`/login${redirectUrl}`)
        }, OAUTH_AUTH_GRACE_MS)

        return () => clearTimeout(timeout)
      }

      // Redirecionar para login com query param redirect para voltar após login
      // Preservar query params se existirem (ex: ?search=term)
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
  }, [isAuthenticated, isLoading, hasOAuthFlags, router, pathname, searchParams])

  // Mostrar loading durante verificação
  if (isLoading || (!isAuthenticated && hasOAuthFlags)) {
    return <LoadingPage />
  }

  // Não renderizar children se não autenticado (redirecionamento está em andamento)
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

