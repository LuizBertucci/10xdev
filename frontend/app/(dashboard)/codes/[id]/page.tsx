'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import CardFeatureCompact from '@/components/CardFeatureCompact'
import { cardFeatureService } from '@/services/cardFeatureService'
import type { CardFeature } from '@/types'

export default function CodeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : undefined
  const [card, setCard] = useState<CardFeature | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('ID não fornecido')
      setLoading(false)
      return
    }
    cardFeatureService.getById(id)
      .then(res => {
        if (res?.data) setCard(res.data)
        else setError('Card não encontrado')
      })
      .catch(() => setError('Card não encontrado'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-gray-400">Carregando...</div>
  if (error || !card) return <div className="p-8 text-red-500">{error ?? 'Não encontrado'}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-sm overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors whitespace-nowrap"
        >
          Início
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <button
          type="button"
          onClick={() => router.push('/codes')}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors whitespace-nowrap"
        >
          Códigos
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="text-gray-900 font-medium truncate">{card.title}</span>
      </div>

      <CardFeatureCompact
        snippet={card}
        onEdit={() => {}}
        onDelete={() => {}}
        defaultExpanded={true}
        expandOnClick={true}
      />
    </div>
  )
}
