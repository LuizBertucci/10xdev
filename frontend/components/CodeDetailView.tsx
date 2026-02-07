"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Calendar, Tag, ChevronRight, Code2, Copy, Check } from "lucide-react"
import ContentRenderer from "@/components/ContentRenderer"
import { Button } from "@/components/ui/button"
import { cardFeatureService } from "@/services"
import type { CardFeature as CardFeatureType } from "@/types"

interface CodeDetailViewProps {
  platformState?: {
    activeTab: string
    setActiveTab: (tab: string) => void
  }
}

export default function CodeDetailView({ platformState }: CodeDetailViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams?.get('id')
  const [cardFeature, setCardFeature] = useState<CardFeatureType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedScreen, setCopiedScreen] = useState<number | null>(null)

  const handleBack = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    const currentTab = platformState?.activeTab || 'codes'
    params.set('tab', currentTab)
    params.delete('id')
    router.push(`/?${params.toString()}`)
  }

  const handleGoHome = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('id')
    params.delete('tab')
    router.push(`/?${params.toString()}`)
  }

  useEffect(() => {
    if (!id) return
    router.refresh()
    const fetchContent = async () => {
      setLoading(true)
      setError(null)
      try {
        const cardRes = await cardFeatureService.getById(id)
        if (cardRes?.success && cardRes.data) {
          setCardFeature(cardRes.data)
        } else {
          setError(cardRes?.error || "Código não encontrado")
        }
      } catch (error) {
        console.error('Erro ao carregar código:', error)
        setError("Erro ao carregar código")
      } finally {
        setLoading(false)
      }
    }
    fetchContent()
  }, [id])

  const formatDate = (iso?: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  }

  const copyScreenContent = async (screenIndex: number) => {
    const screen = cardFeature?.screens[screenIndex]
    if (!screen) return
    const allContent = screen.blocks
      .map(b => b.type === 'code' ? `// ${b.route || 'Arquivo'}\n${b.content}` : b.content)
      .join('\n\n')
    await navigator.clipboard.writeText(allContent)
    setCopiedScreen(screenIndex)
    setTimeout(() => setCopiedScreen(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-red-600 bg-red-50 p-4 rounded-lg">{error}</div>
      </div>
    )
  }

  if (!cardFeature) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-gray-600">Código não encontrado</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-sm overflow-x-auto pb-2">
        <button
          type="button"
          onClick={handleGoHome}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors whitespace-nowrap"
        >
          Início
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <button
          type="button"
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors whitespace-nowrap"
        >
          Códigos
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-none">
          {cardFeature.title}
        </span>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="h-5 w-5 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 truncate">{cardFeature.title}</h1>
            </div>
            <p className="text-gray-600 whitespace-pre-wrap">{cardFeature.description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {cardFeature.tech || 'Geral'}
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
              {cardFeature.language || 'text'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {cardFeature.screens.map((screen, screenIndex) => (
          <div
            key={screenIndex}
            className="flex-shrink-0 w-[600px] bg-white rounded-lg shadow-sm border overflow-hidden"
          >
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{screen.name}</h2>
                {screen.description && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{screen.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyScreenContent(screenIndex)}
                className="text-gray-500 hover:text-gray-700"
              >
                {copiedScreen === screenIndex ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="p-4 max-h-[500px] overflow-auto">
              <ContentRenderer blocks={screen.blocks} />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            {formatDate(cardFeature.createdAt)}
          </div>
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
          <div className="ml-auto text-gray-400">
            {cardFeature.screens?.length || 0} aba(s) • {cardFeature.screens?.reduce((sum, s) => sum + (s.blocks?.length || 0), 0) || 0} bloco(s)
          </div>
        </div>
      </div>
    </div>
  )
}
