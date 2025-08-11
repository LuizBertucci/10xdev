'use client'

/**
 * PROTECTED ROUTE - Proteção de rotas com redirecionamento
 * 
 * Baseado no padrão before_action :verify_user da documentação:
 * - Verifica se usuário está logado
 * - Redireciona para login se não autenticado
 * - Salva URL atual para redirecionamento pós-login
 * - Mostra loading durante verificação
 */

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  fallbackComponent?: React.ReactNode
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  fallbackComponent 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuthentication = async () => {
      // Aguardar carregamento inicial do auth
      if (isLoading) {
        return
      }

      console.log(`🛡️ [ProtectedRoute] Verificando acesso a: ${pathname}`)

      // Se não está autenticado, redirecionar para login
      if (!isAuthenticated) {
        console.log('❌ [ProtectedRoute] Usuário não autenticado, redirecionando...')
        
        // Salvar URL atual para redirecionamento pós-login
        if (pathname !== '/' && pathname !== '/login' && pathname !== '/register') {
          sessionStorage.setItem('redirectAfterLogin', pathname || '/')
        }
        
        // Definir mensagem de redirecionamento
        sessionStorage.setItem('loginMessage', 'Você precisa estar logado para acessar esta página.')
        
        // Redirecionar para login
        router.push('/login')
        return
      }

      // Se requer admin mas usuário não é admin
      if (requireAdmin && !isAdmin) {
        console.log('❌ [ProtectedRoute] Acesso negado - Admin necessário')
        
        // Redirecionar para página principal com mensagem
        sessionStorage.setItem('errorMessage', 'Você não tem permissão para acessar esta página.')
        router.push('/')
        return
      }

      console.log(`✅ [ProtectedRoute] Acesso permitido a: ${pathname}`)
      setIsChecking(false)
    }

    checkAuthentication()
  }, [isLoading, isAuthenticated, isAdmin, pathname, router, requireAdmin])

  // Mostrar loading durante verificação inicial
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mb-4 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Verificando acesso...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Aguarde enquanto verificamos suas permissões
          </p>
        </div>
      </div>
    )
  }

  // Se não passou na verificação, não renderizar conteúdo
  if (!isAuthenticated || (requireAdmin && !isAdmin)) {
    return fallbackComponent || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Acesso Restrito
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Redirecionando...
          </p>
        </div>
      </div>
    )
  }

  // Renderizar conteúdo protegido
  return <>{children}</>
}

/**
 * HOC para proteger páginas
 */
export function withProtectedRoute<T extends object>(
  Component: React.ComponentType<T>,
  options: { requireAdmin?: boolean } = {}
) {
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute requireAdmin={options.requireAdmin}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

/**
 * Hook para verificar acesso programaticamente
 */
export function useRouteProtection() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const requireAuth = () => {
    if (isLoading) return false
    
    if (!isAuthenticated) {
      // Salvar URL para redirecionamento
      if (pathname !== '/' && pathname !== '/login') {
        sessionStorage.setItem('redirectAfterLogin', pathname || '/')
      }
      
      sessionStorage.setItem('loginMessage', 'Login necessário para continuar.')
      router.push('/login')
      return false
    }
    
    return true
  }

  const requireAdmin = () => {
    if (!requireAuth()) return false
    
    if (!isAdmin) {
      sessionStorage.setItem('errorMessage', 'Acesso negado - Privilégios de administrador necessários.')
      router.push('/')
      return false
    }
    
    return true
  }

  return {
    requireAuth,
    requireAdmin,
    isAuthenticated,
    isAdmin,
    isLoading
  }
}