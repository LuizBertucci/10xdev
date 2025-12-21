'use client'

import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getDefaultRoute } from '@/utils/routes'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: 'admin' | 'user' | 'consultor'
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirecionar para login com query param redirect para voltar após login
      // Preservar query params se existirem (ex: ?tab=home)
      const currentPath = pathname === '/' && searchParams.toString() 
        ? `/?${searchParams.toString()}`
        : pathname
      
      const redirectUrl = currentPath !== '/' 
        ? `?redirect=${encodeURIComponent(currentPath)}` 
        : '?redirect=' + encodeURIComponent(getDefaultRoute())
      
      // Usar replace ao invés de push para não criar entrada no histórico
      router.replace(`/login${redirectUrl}`)
    }

    // Verificar role se especificado
    if (!isLoading && isAuthenticated && requireRole && user) {
      if (user.role !== requireRole) {
        // Redirecionar para home se não tiver o role necessário
        router.replace('/')
      }
    }
  }, [isAuthenticated, isLoading, user, requireRole, router, pathname, searchParams])

  // Mostrar loading durante verificação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  // Não renderizar children se não autenticado (redirecionamento está em andamento)
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

