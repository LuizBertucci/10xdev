"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Tag, ExternalLink, Search, Code2, ChevronRight, Pencil, Plus, Trash2, FileText } from "lucide-react"
import YouTubeVideo from "@/components/youtube-video"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { contentService, ContentType, type Content } from "@/services/contentService"
import { cardFeatureService, type CardFeature as CardFeatureType } from "@/services"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"

interface PlatformState {
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

interface ContentDetailProps {
  platformState?: PlatformState
}

export default function ContentDetail({ platformState }: ContentDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams?.get('id') || null
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [content, setContent] = useState<Content | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // CardFeatures state
  const [cardFeatures, setCardFeatures] = useState<CardFeatureType[]>([])
  const [selectedCardFeature, setSelectedCardFeature] = useState<CardFeatureType | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingCards, setLoadingCards] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    if (!id) return
    
    const fetchContent = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await contentService.getContent(id)
        if (res.success && res.data) {
          setContent(res.data)
          
          // Se o conteúdo tem um CardFeature selecionado, carregar ele
          if (res.data.selectedCardFeatureId) {
            try {
              const cardRes = await cardFeatureService.getById(res.data.selectedCardFeatureId)
              if (cardRes.success && cardRes.data) {
                setSelectedCardFeature(cardRes.data)
              }
            } catch (e) {
              console.error('Erro ao carregar CardFeature selecionado:', e)
            }
          }
        } else {
          setError(res.error || 'Conteúdo não encontrado')
        }
      } catch (e) {
        setError('Erro ao carregar conteúdo')
      } finally {
        setLoading(false)
      }
    }
    
    fetchContent()
  }, [id])

  const fetchCardFeatures = async () => {
    setLoadingCards(true)
    try {
      const res = await cardFeatureService.getAll({ limit: 200 })
      if (res.success && res.data) {
        setCardFeatures(res.data)
      } else {
        const errorMessage = res.error || 'Erro ao carregar CardFeatures'
        console.error('Erro ao buscar CardFeatures:', errorMessage, res)
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (e: any) {
      const errorMessage = e?.error || e?.message || (typeof e === 'string' ? e : 'Erro ao carregar CardFeatures')
      console.error('Erro ao buscar CardFeatures:', {
        message: errorMessage,
        error: e,
        statusCode: e?.statusCode
      })
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingCards(false)
    }
  }

  const handleSearchCardFeatures = () => {
    fetchCardFeatures()
    setIsSearchOpen(true)
  }

  const handleSelectCardFeature = async (cardFeature: CardFeatureType) => {
    if (!content) {
      toast({
        title: "Erro",
        description: "Conteúdo não encontrado.",
        variant: "destructive",
      })
      return
    }

    try {
      await contentService.updateSelectedCardFeature(content.id, cardFeature.id)
      setSelectedCardFeature(cardFeature)
      setIsSearchOpen(false)
      toast({
        title: "Sucesso!",
        description: "CardFeature selecionado com sucesso.",
      })
    } catch (e) {
      console.error('Erro ao salvar CardFeature selecionado:', e)
      toast({
        title: "Erro",
        description: "Erro ao selecionar CardFeature.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveCardFeature = async () => {
    if (!content) {
      toast({
        title: "Erro",
        description: "Conteúdo não encontrado.",
        variant: "destructive",
      })
      return
    }

    try {
      await contentService.updateSelectedCardFeature(content.id, null)
      setSelectedCardFeature(null)
      setIsEditMode(false)
      toast({
        title: "Sucesso!",
        description: "CardFeature removido com sucesso.",
      })
    } catch (e) {
      console.error('Erro ao remover CardFeature selecionado:', e)
      toast({
        title: "Erro",
        description: "Erro ao remover CardFeature.",
        variant: "destructive",
      })
    }
  }

  const handleBack = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', 'contents')
    if (content?.contentType === ContentType.VIDEO) {
      params.set('type', ContentType.VIDEO)
    }
    params.delete('id')
    router.push(`/?${params.toString()}`)
  }

  const goToTab = (tab: 'home' | 'contents') => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('id')
    if (tab === 'home') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/')
  }

  const filteredCardFeatures = cardFeatures.filter(cf =>
    (cf.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cf.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cf.tech || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const isVideo = content?.contentType === ContentType.VIDEO
  const itemLabel = isVideo ? 'vídeo' : 'conteúdo'
  const itemLabelTitle = isVideo ? 'Vídeo' : 'Conteúdo'

  if (loading) {
    return <div className="text-gray-600">Carregando...</div>
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-gray-600">Conteúdo não encontrado</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          type="button"
          onClick={() => goToTab('home')}
          className="hover:text-gray-900"
        >
          Início
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <button
          type="button"
          onClick={handleBack}
          className="hover:text-gray-900"
        >
          {isVideo ? 'Vídeos' : 'Conteúdos'}
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900 font-medium truncate max-w-[160px] sm:max-w-none">
          {content.title}
        </span>
      </div>

      {/* Layout: Videos tem 2 colunas (conteudo + CardFeature), outros tem 1 coluna */}
      <div className={isVideo ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-4"}>
        {/* Coluna de Conteudo */}
        <div className="space-y-4">
          {/* Video Player ou Content Preview */}
          {isVideo && content.youtubeUrl ? (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <YouTubeVideo url={content.youtubeUrl} mode="embed" />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">{content.title}</h2>
              </div>
              {content.markdownContent && (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">{content.markdownContent}</pre>
                </div>
              )}
              {content.fileUrl && (
                <div className="mt-4 pt-4 border-t">
                  <a
                    href={content.fileUrl}
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
          )}

          {/* Content Info */}
          <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
            {/* Description */}
            {content.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Descrição</h3>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{content.description}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {formatDate(content.createdAt)}
              </div>
              {content.category && (
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  {content.category}
                </div>
              )}
            </div>

            {/* Tags */}
            {content.tags && content.tags.length > 0 && (
              <div className="pt-3 border-t">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {isVideo && content.youtubeUrl && (
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(content.youtubeUrl, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Abrir no YouTube
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Coluna CardFeature (apenas para videos) */}
        {isVideo && (
          <div className="lg:col-span-1 space-y-4">
            {/* Título e Botões */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-gray-900 truncate">Cards relacionados</h2>
              {isAdmin && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedCardFeature && (
                    <Button
                      variant={isEditMode ? "secondary" : "ghost"}
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => setIsEditMode((v) => !v)}
                      title={isEditMode ? "Sair do modo de edição" : "Editar lista"}
                    >
                      <Pencil className={`h-4 w-4 ${isEditMode ? "text-blue-600" : "text-gray-600"}`} />
                    </Button>
                  )}
                  <Button onClick={handleSearchCardFeatures} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" /> Adicionar
                  </Button>
                </div>
              )}
            </div>

            {/* Card ou Estado vazio */}
            {selectedCardFeature ? (
              <div className="relative">
                <CardFeatureCompact
                  snippet={selectedCardFeature}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />

                {/* Ações por card (apenas no modo de edição e admin) */}
                {isEditMode && isAdmin && (
                  <div className="absolute top-3 right-3 rounded-lg shadow-md border bg-white p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveCardFeature()
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      title="Remover CardFeature relacionado"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center h-full flex flex-col items-center justify-center">
                <Code2 className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-600 text-sm mb-4">
                  {isAdmin ? "Selecione um CardFeature para este vídeo" : "Nenhum CardFeature associado"}
                </p>
                {isAdmin && (
                  <Button onClick={handleSearchCardFeatures} variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    + Adicionar
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog: Search CardFeatures */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar CardFeature</DialogTitle>
            <DialogDescription>
              Escolha um CardFeature para associar a este {itemLabel}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por título, descrição ou tecnologia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
              {filteredCardFeatures.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-600">
                  Nenhum CardFeature encontrado
                </div>
              ) : (
                filteredCardFeatures.map(cf => (
                  <div
                    key={cf.id}
                    className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition"
                    onClick={() => handleSelectCardFeature(cf)}
                  >
                    <h4 className="font-semibold text-gray-900 mb-1">{cf.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{cf.description}</p>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{cf.tech}</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{cf.language}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
