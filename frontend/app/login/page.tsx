'use client'

import React from 'react'
import Login from '@/pages/Login'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthContext'
import { useEffect } from 'react'

export default function LoginPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  // Se já estiver autenticado, redireciona para a home
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  // Se autenticado, não renderiza nada (vai redirecionar)
  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Tela de Login */}
      <main className="flex items-center justify-center min-h-screen py-6 px-4">
        <div className="w-full max-w-lg">
          {/* Boas-vindas em português */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bem-vindo de volta!
            </h2>
            <p className="text-gray-600 text-sm">
              Faça login para acessar sua plataforma de desenvolvimento
            </p>
          </div>

          {/* Login Component */}
          <Login onSuccess={() => router.push('/')} />

          {/* Informações adicionais */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-1">
                <span>🔐</span>
                <span>Acesso Seguro</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>⚡</span>
                <span>Login Rápido</span>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2 text-sm">Credenciais de Teste:</h3>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Admin:</strong> admin@10xdev.com / Admin123!</p>
                <p><strong>Usuário:</strong> user@10xdev.com / User123!</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
