'use client'

/**
 * LOGIN PAGE - Página de login com redirecionamento
 * 
 * Baseado no padrão front/pages/login/index.vue da documentação:
 * - Login com redirecionamento automático pós-sucesso
 * - Mensagens de erro/informação
 * - Redirecionamento para página salva
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/Auth/AuthModal'

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Se já está logado, redirecionar
    if (!isLoading && isAuthenticated) {
      handleSuccessfulLogin()
      return
    }

    // Carregar mensagem salva (se houver)
    const savedMessage = sessionStorage.getItem('loginMessage') || 
                         sessionStorage.getItem('errorMessage')
    if (savedMessage) {
      setMessage(savedMessage)
      sessionStorage.removeItem('loginMessage')
      sessionStorage.removeItem('errorMessage')
    }

    // Mostrar modal de login
    if (!isLoading) {
      setShowModal(true)
    }
  }, [isAuthenticated, isLoading])

  const handleSuccessfulLogin = () => {
    console.log('✅ [LoginPage] Login bem-sucedido, verificando redirecionamento...')
    
    // Verificar se há URL salva para redirecionamento
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin')
    
    if (redirectUrl) {
      console.log(`🔄 [LoginPage] Redirecionando para: ${redirectUrl}`)
      sessionStorage.removeItem('redirectAfterLogin')
      router.push(redirectUrl as any)
    } else {
      console.log('🏠 [LoginPage] Redirecionando para home')
      router.push('/')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    // Se fechar sem logar, voltar para home
    router.push('/')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se já logado, mostrar redirecionamento
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Já logado!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Redirecionando...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Logo e título */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            10xDev
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Faça login para acessar a plataforma
          </p>
        </div>

        {/* Mensagem de informação/erro */}
        {message && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-blue-700 dark:text-blue-300 text-sm text-center">
              {message}
            </p>
          </div>
        )}

        {/* Credenciais demo */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 text-center">
            Credenciais para demonstração:
          </h3>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center justify-between">
              <span>👑 <strong>Admin:</strong></span>
              <span>admin@10xdev.com / 123456</span>
            </div>
            <div className="flex items-center justify-between">
              <span>👤 <strong>Usuário:</strong></span>
              <span>user@10xdev.com / 123456</span>
            </div>
          </div>
        </div>

        {/* Botão para abrir modal (caso esteja fechado) */}
        {!showModal && (
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 font-medium transition-all"
          >
            Fazer Login
          </button>
        )}
      </div>

      {/* Modal de autenticação */}
      <AuthModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={handleSuccessfulLogin}
      />
    </div>
  )
}