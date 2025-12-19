"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { cardFeatureService } from "@/services/cardFeatureService"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import type { ReviewStats } from "@/types"

interface CardReviewProps {
  cardId: string
  compact?: boolean
}

export default function CardReview({ cardId, compact = false }: CardReviewProps) {
  const { user } = useAuth()
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Carregar estatísticas
  useEffect(() => {
    if (!cardId) return

    const loadStats = async () => {
      try {
        setLoading(true)
        const response = await cardFeatureService.getReviewStats(cardId)
        if (response?.success && response.data) {
          setStats(response.data)
        }
      } catch (error) {
        console.error('Erro ao carregar reviews:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [cardId])

  // Função para avaliar
  const handleRating = async (rating: number) => {
    if (!user) {
      toast.error("Você precisa estar logado para avaliar")
      return
    }

    if (rating < 1 || rating > 5 || submitting) {
      return
    }

    // Limpar hover ao clicar
    setHoverRating(null)

    // Se clicar na mesma estrela que já está selecionada, remover a review
    const currentUserRating = stats?.userReview?.rating
    const shouldRemove = currentUserRating !== undefined && 
                        currentUserRating !== null && 
                        Number(currentUserRating) === Number(rating)
    
    if (shouldRemove) {
      await handleRemoveRating()
      return
    }

    try {
      setSubmitting(true)
      const response = await cardFeatureService.createOrUpdateReview(cardId, { rating })
      
      if (response?.success) {
        // Recarregar estatísticas
        const statsResponse = await cardFeatureService.getReviewStats(cardId)
        if (statsResponse?.success && statsResponse.data) {
          setStats(statsResponse.data)
        }
        toast.success("Avaliação salva com sucesso!")
      } else {
        toast.error(response?.error || "Erro ao salvar avaliação")
      }
    } catch (error) {
      console.error('Erro ao avaliar:', error)
      toast.error("Erro ao salvar avaliação")
    } finally {
      setSubmitting(false)
    }
  }

  // Função para remover avaliação
  const handleRemoveRating = async () => {
    if (!user) return

    try {
      setSubmitting(true)
      const response = await cardFeatureService.deleteReview(cardId)
      
      if (response?.success) {
        // Recarregar estatísticas
        const statsResponse = await cardFeatureService.getReviewStats(cardId)
        if (statsResponse?.success && statsResponse.data) {
          setStats(statsResponse.data)
        }
        toast.success("Avaliação removida")
      } else {
        toast.error(response?.error || "Erro ao remover avaliação")
      }
    } catch (error) {
      console.error('Erro ao remover avaliação:', error)
      toast.error("Erro ao remover avaliação")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-gray-400">
        <Star className="h-3 w-3" />
        <span className="text-xs">Carregando...</span>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const displayRating = hoverRating ?? (stats.userReview?.rating ?? stats.averageRating)

  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : ''}`}>
      {/* Estrelas interativas */}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((starRating) => {
          const isFilled = starRating <= Math.round(displayRating)
          const isUserRating = stats.userReview && Number(stats.userReview.rating) === Number(starRating)
          
          return (
            <button
              key={starRating}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRating(starRating)
              }}
              onMouseEnter={() => user && setHoverRating(starRating)}
              onMouseLeave={() => setHoverRating(null)}
              disabled={!user || submitting}
              className={`
                transition-all duration-150
                ${user && !submitting ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                ${submitting ? 'opacity-50' : ''}
                ${isUserRating ? 'ring-2 ring-blue-400 ring-offset-1 rounded' : ''}
              `}
              title={
                !user 
                  ? "Faça login para avaliar"
                  : isUserRating
                  ? `Sua avaliação: ${starRating} estrelas (clique para remover)`
                  : `Avaliar com ${starRating} estrelas`
              }
            >
              <Star
                className={`
                  ${compact ? 'h-3 w-3' : 'h-4 w-4'}
                  transition-colors duration-150
                  ${isFilled 
                    ? 'fill-amber-400 text-amber-500' 
                    : 'fill-gray-200 text-gray-300'
                  }
                  ${user && !submitting && hoverRating === starRating ? 'fill-amber-300 text-amber-400' : ''}
                `}
              />
            </button>
          )
        })}
      </div>

      {/* Média e total */}
      {!compact && (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <span className="font-medium">{stats.averageRating.toFixed(1)}</span>
          {stats.totalReviews > 0 && (
            <span className="text-xs text-gray-500">
              ({stats.totalReviews} {stats.totalReviews === 1 ? 'avaliação' : 'avaliações'})
            </span>
          )}
        </div>
      )}

      {/* Versão compacta: apenas número */}
      {compact && stats.totalReviews > 0 && (
        <span className="text-xs text-gray-500">
          {stats.averageRating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
