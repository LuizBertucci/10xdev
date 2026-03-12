'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import CardFeatureCompact from '@/components/CardFeatureCompact'
import CardFeatureForm from '@/components/CardFeatureForm'
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog'
import { useAuth } from '@/hooks/useAuth'
import { cardFeatureService } from '@/services/cardFeatureService'
import { toast } from 'sonner'
import type { CardFeature, CreateCardFeatureData } from '@/types'

export default function CodeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isProfileLoaded } = useAuth()
  const id = typeof params?.id === 'string' ? params.id : undefined
  const [card, setCard] = useState<CardFeature | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingCard, setDeletingCard] = useState<CardFeature | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canEditCard = (snippet: CardFeature) =>
    user?.role === 'admin' || (!!user?.id && snippet.createdBy === user.id)

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

  const handleEditSubmit = async (formData: unknown): Promise<CardFeature | null> => {
    if (!card) return null

    try {
      setIsUpdating(true)
      const response = await cardFeatureService.update(
        card.id,
        formData as Partial<CreateCardFeatureData>
      )

      if (response?.success && response.data) {
        setCard(response.data)
        setIsEditing(false)
        toast.success('CardFeature atualizado com sucesso')
        return response.data
      }

      toast.error(response?.error || 'Erro ao atualizar CardFeature')
      return null
    } catch (submitError: unknown) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : 'Erro ao atualizar CardFeature'
      )
      return null
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingCard) return

    try {
      setIsDeleting(true)
      const response = await cardFeatureService.delete(deletingCard.id)

      if (!response?.success) {
        toast.error(response?.error || 'Erro ao excluir CardFeature')
        return
      }

      toast.success('CardFeature excluído com sucesso')
      setDeletingCard(null)
      router.push('/codes')
    } catch (deleteError: unknown) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir CardFeature'
      )
    } finally {
      setIsDeleting(false)
    }
  }

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
        onEdit={(snippet) => {
          if (!canEditCard(snippet)) return
          setIsEditing(true)
        }}
        onDelete={() => {
          if (!canEditCard(card)) return
          setDeletingCard(card)
        }}
        onUpdate={async (cardId, data) => {
          const updated = await cardFeatureService.update(cardId, data)
          if (updated?.success && updated.data) setCard(updated.data)
        }}
        canEdit={canEditCard(card)}
        defaultExpanded={true}
        expandOnClick={true}
      />

      {isProfileLoaded && user && (
        <>
          <CardFeatureForm
            isOpen={isEditing}
            mode="edit"
            initialData={card}
            isLoading={isUpdating}
            onClose={() => setIsEditing(false)}
            onSubmit={handleEditSubmit}
            isAdmin={user.role === 'admin'}
          />

          <DeleteConfirmationDialog
            isOpen={!!deletingCard}
            snippet={deletingCard}
            isDeleting={isDeleting}
            onClose={() => setDeletingCard(null)}
            onConfirm={handleDeleteConfirm}
          />
        </>
      )}
    </div>
  )
}
