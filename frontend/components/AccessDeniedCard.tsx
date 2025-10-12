'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function AccessDeniedCard() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Você não tem permissão para acessar esta página</p>
        <Button onClick={() => router.push('/login')} className="w-full">
          Fazer Login
        </Button>
      </div>
    </div>
  )
}
