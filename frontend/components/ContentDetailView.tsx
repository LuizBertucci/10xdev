"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Calendar, Tag, ExternalLink, ChevronRight, FileText } from "lucide-react"
import YouTubeVideo from "@/components/youtube-video"
import ContentRenderer from "@/components/ContentRenderer"
import { Button } from "@/components/ui/button"
import { cardFeatureService, type CardFeature as CardFeatureType } from "@/services"
import { ContentType } from "@/types"

interface ContentDetailViewProps {
  id?: string | null
  onBack: () => void
  onGoHome: () => void
}

export default function ContentDetailView({ id, onBack, onGoHome }: ContentDetailViewProps) {
  const [cardFeature, setCardFeature] = useState<CardFeatureType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError("Conteúdo não encontrado")
      setCardFeature(null)
      return
    }

    const fetchContent = async () => {
      setLoading(true)
      setError(null)
      try {
        const cardRes = await cardFeatureService.getById(id)
        if (cardRes?.success && cardRes.data) {
          setCardFeature(cardRes.data)
        } else {
          setError(cardRes?.error || "Conteúdo não encontrado")
        }
      } catch (e) {
        setError("Erro ao carregar conteúdo")
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [id])

  const formatDate = (iso?: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })
  }

  if (loading) {
    return <div className="text-gray-600">Carregando...</div>
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  if (!cardFeature) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-gray-600">Conteúdo não encontrado</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm">
        <button
          type="button"
          onClick={onGoHome}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
        >
          Início
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <button
          type="button"
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
        >
          Conteúdos
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900 font-medium truncate max-w-[160px] sm:max-w-none">
          {cardFeature.title}
        </span>
      </div>

      <div className="space-y-4">
        {(() => {
          const youtubeBlockUrl =
            (cardFeature.screens ?? [])
              .flatMap((screen) => screen.blocks ?? [])
              .find((block) => block.type === ContentType.YOUTUBE && block.content)?.content || ""
          const resolvedYoutubeUrl = cardFeature.youtubeUrl || youtubeBlockUrl
          return (
            resolvedYoutubeUrl && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <YouTubeVideo url={resolvedYoutubeUrl} mode="embed" />
              </div>
            )
          )
        })()}

        {/* Renderizar screens/blocos */}
        {(cardFeature.screens ?? []).map((screen, screenIndex) => (
          <div key={screenIndex} className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{screen.name}</h2>
            {screen.description && (
              <p className="text-gray-600 text-sm mb-4">{screen.description}</p>
            )}
            <ContentRenderer blocks={screen.blocks ?? []} />
          </div>
        ))}

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
          {cardFeature.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Descrição</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{cardFeature.description}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              {formatDate(cardFeature.createdAt)}
            </div>
            {cardFeature.category && (
              <div className="flex items-center gap-2">
                <Tag className="h-3 w-3" />
                {cardFeature.category}
              </div>
            )}
            {cardFeature.tags && cardFeature.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-3 w-3" />
                {cardFeature.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {cardFeature.fileUrl && (
              <div className="mt-4 pt-4 border-t">
                <a
                  href={cardFeature.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <FileText className="h-4 w-4" />
                  Abrir PDF
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
