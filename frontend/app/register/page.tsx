'use client'

import React from 'react'
import Register from '@/pages/Register'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthContext'
import { useEffect } from 'react'

export default function RegisterPage() {
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

  return <Register onSuccess={() => router.push('/')} />
}
