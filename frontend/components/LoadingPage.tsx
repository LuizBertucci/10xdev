'use client'

import { Loader2 } from 'lucide-react'

interface LoadingPageProps {
  text?: string
}

export default function LoadingPage({ text = 'Carregando...' }: LoadingPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-lg text-gray-600">{text}</p>
      </div>
    </div>
  )
}
