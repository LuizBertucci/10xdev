"use client"

import { useEffect, useState, useCallback } from "react"
import { ArrowLeft, Calendar, Tag, ChevronRight, Plus, X, Search, Loader2, Edit } from "lucide-react"
import YouTubeVideo from "@/components/youtube-video"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import TutorialForm from "@/components/TutorialForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { contentService, cardFeatureService } from "@/services"
import type { Content } from "@/types/content"
import type { CardFeature as CardFeatureType } from "@/types"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"

interface TutorialDetailViewProps {
  id?: string | null
  onBack: () => void
  onGoHome: () => void
  onGoToTutorials: () => void
}

export default function TutorialDetailView({ id, onBack, onGoHome, onGoToTutorials }: TutorialDetailViewProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  // Tutorial state
  const [tutorial, setTutorial] = useState<Content | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Related card state
  const [relatedCard, setRelatedCard] = useState<CardFeatureType | null>(null)
  const [loadingRelatedCard, setLoadingRelatedCard] = useState(false)

  // Card search dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<CardFeatureType[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)

  // Edit tutorial dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Fetch tutorial
  useEffect(() => {
    if (!id) return

    const fetchTutorial = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await contentService.getById(id)
        if (res?.success && res.data) {
          setTutorial(res.data)
        } else {
          setError(res?.error || "Tutorial não encontrado")
        }
      } catch (e) {
        setError("Erro ao carregar tutorial")
      } finally {
        setLoading(false)
      }
    }

    fetchTutorial()
  }, [id])

  // Fetch related card when tutorial loads
  useEffect(() => {
    if (!tutorial?.selectedCardFeatureId) {
      setRelatedCard(null)
      return
    }

    const fetchRelatedCard = async () => {
      setLoadingRelatedCard(true)
      try {
        const res = await cardFeatureService.getById(tutorial.selectedCardFeatureId!)
        if (res?.success && res.data) {
          setRelatedCard(res.data)
        }
      } catch (e) {
        console.error("Erro ao carregar card relacionado:", e)
      } finally {
        setLoadingRelatedCard(false)
      }
    }

    fetchRelatedCard()
  }, [tutorial?.selectedCardFeatureId])

  // Search cards
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const res = await cardFeatureService.search(searchTerm, { limit: 20 })
      if (res?.success && res.data) {
        setSearchResults(res.data)
      }
    } catch (e) {
      console.error("Erro na busca:", e)
    } finally {
      setSearching(false)
    }
  }, [searchTerm])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dialogOpen && searchTerm.trim()) {
        handleSearch()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, dialogOpen, handleSearch])

  // Link card to tutorial
  const handleLinkCard = async (cardId: string) => {
    if (!tutorial) return

    setLinking(true)
    try {
      const res = await contentService.updateSelectedCardFeature(tutorial.id, cardId)
      if (res?.success && res.data) {
        setTutorial(res.data)
        setDialogOpen(false)
        setSearchTerm("")
        setSearchResults([])
        toast.success("Card vinculado com sucesso!")
      } else {
        toast.error(res?.error || "Erro ao vincular card")
      }
    } catch (e) {
      toast.error("Erro ao vincular card")
    } finally {
      setLinking(false)
    }
  }

  // Unlink card from tutorial
  const handleUnlinkCard = async () => {
    if (!tutorial) return

    try {
      const res = await contentService.updateSelectedCardFeature(tutorial.id, null)
      if (res?.success && res.data) {
        setTutorial(res.data)
        setRelatedCard(null)
        toast.success("Card desvinculado com sucesso!")
      } else {
        toast.error(res?.error || "Erro ao desvincular card")
      }
    } catch (e) {
      toast.error("Erro ao desvincular card")
    }
  }

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
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
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

  if (!tutorial) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-gray-600">Tutorial não encontrado</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
          onClick={onGoToTutorials}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
        >
          Tutoriais
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900 font-medium truncate max-w-[160px] sm:max-w-none">
          {tutorial.title}
        </span>
      </div>

      {/* Title Header - Full Width */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {tutorial.title}
            </h1>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="text-gray-500 hover:text-blue-600"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatDate(tutorial.createdAt)}
            </div>
            {tutorial.category && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {tutorial.category}
              </div>
            )}
            {tutorial.tags && tutorial.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {tutorial.tags.slice(0, 3).map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
                {tutorial.tags.length > 3 && (
                  <span className="text-xs text-gray-400">+{tutorial.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Layout - 50/50 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Video */}
        <div>
          {/* Video Player */}
          {tutorial.youtubeUrl && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <YouTubeVideo url={tutorial.youtubeUrl} mode="embed" />
            </div>
          )}
        </div>

        {/* Right Column - Related Card */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Card Relacionado</h2>
            {isAdmin && relatedCard && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnlinkCard}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Remover
              </Button>
            )}
          </div>

          {loadingRelatedCard ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : relatedCard ? (
            <CardFeatureCompact
              snippet={relatedCard}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ) : (
            <div className="py-8 text-center">
              <div className="text-gray-400 mb-4">
                <Tag className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-600 mb-4">
                Nenhum card relacionado
              </p>
              {isAdmin && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Selecionar Card</DialogTitle>
                      <DialogDescription>
                        Busque e selecione um card para relacionar com este tutorial
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar cards..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        autoFocus
                      />
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto mt-4 space-y-2 min-h-[200px] max-h-[400px]">
                      {searching ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((card) => (
                          <div
                            key={card.id}
                            className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleLinkCard(card.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {card.title}
                                </h4>
                                {card.description && (
                                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                    {card.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  {card.tech && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                      {card.tech}
                                    </span>
                                  )}
                                  {card.language && (
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                      {card.language}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {linking ? (
                                <Loader2 className="h-5 w-5 animate-spin text-gray-400 flex-shrink-0" />
                              ) : (
                                <Plus className="h-5 w-5 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))
                      ) : searchTerm.trim() ? (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum card encontrado
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          Digite para buscar cards
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Tutorial Form */}
      <TutorialForm
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        mode="edit"
        tutorial={tutorial}
        onSuccess={(updatedTutorial) => setTutorial(updatedTutorial)}
      />
    </div>
  )
}
