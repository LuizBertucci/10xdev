"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { ArrowLeft, Calendar, Tag, ExternalLink, Search, Code2 } from "lucide-react"
import YouTubeVideo from "@/components/youtube-video"
import CardFeature from "@/components/CardFeature"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { videoService, type Video } from "@/services/videoService"
import { cardFeatureService, type CardFeature as CardFeatureType } from "@/services"
import { useToast } from "@/hooks/use-toast"

export default function VideoDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { toast } = useToast()
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // CardFeatures state
  const [cardFeatures, setCardFeatures] = useState<CardFeatureType[]>([])
  const [selectedCardFeature, setSelectedCardFeature] = useState<CardFeatureType | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingCards, setLoadingCards] = useState(false)

  useEffect(() => {
    if (!id || typeof id !== 'string') return
    
    const fetchVideo = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await videoService.getVideo(id)
        if (res.success && res.data) {
          setVideo(res.data)
          
          // Se o vídeo tem um CardFeature selecionado, carregar ele
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
          setError(res.error || 'Vídeo não encontrado')
        }
      } catch (e) {
        setError('Erro ao carregar vídeo')
      } finally {
        setLoading(false)
      }
    }
    
    fetchVideo()
  }, [id])

  const fetchCardFeatures = async () => {
    setLoadingCards(true)
    try {
      const res = await cardFeatureService.getAll({ page: 1, limit: 500 })
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
      // Extrair mensagem de erro de forma mais robusta
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
    if (!video) {
      toast({
        title: "Erro",
        description: "Vídeo não encontrado.",
        variant: "destructive",
      })
      return
    }

    try {
      // Salvar no banco de dados
      await videoService.updateSelectedCardFeature(video.id, cardFeature.id)

      // Atualizar estado local
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
    if (!video) {
      toast({
        title: "Erro",
        description: "Vídeo não encontrado.",
        variant: "destructive",
      })
      return
    }

    try {
      // Remover do banco de dados
      await videoService.updateSelectedCardFeature(video.id, null)

      // Atualizar estado local
      setSelectedCardFeature(null)
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

  const filteredCardFeatures = cardFeatures.filter(cf =>
    cf.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cf.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cf.tech.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (loading) {
    return <div className="text-gray-600">Carregando...</div>
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/videos')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/videos')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-gray-600">Vídeo não encontrado</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/videos')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {selectedCardFeature && (
            <Button 
              variant="outline" 
              onClick={handleRemoveCardFeature}
              className="text-red-600 hover:text-red-700"
            >
              Remover CardFeature
            </Button>
          )}
          <Button onClick={handleSearchCardFeatures} className="bg-blue-600 hover:bg-blue-700">
            <Code2 className="h-4 w-4 mr-2" /> Buscar CardFeatures
          </Button>
        </div>
      </div>

      {/* Layout: Video + CardFeature */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Video */}
        <div className="space-y-4">
          {/* Video Player */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <YouTubeVideo url={video.youtubeUrl} mode="embed" />
          </div>

          {/* Video Info */}
          <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
            {/* Description */}
            {video.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Descrição</h3>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{video.description}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {formatDate(video.createdAt)}
              </div>
              {video.category && (
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  {video.category}
                </div>
              )}
            </div>

            {/* Tags */}
            {video.tags && video.tags.length > 0 && (
              <div className="pt-3 border-t">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {video.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(video.youtubeUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Abrir no YouTube
              </Button>
            </div>
          </div>
        </div>

        {/* Right: CardFeature (1/2) */}
        <div className="lg:col-span-1">
          {selectedCardFeature ? (
            <CardFeature
              snippet={selectedCardFeature}
              onEdit={() => {}}
              onExpand={() => {}}
              onDelete={() => {}}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center h-full flex flex-col items-center justify-center">
              <Code2 className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600 text-sm mb-4">
                Selecione um CardFeature para visualizar
              </p>
              <Button onClick={handleSearchCardFeatures} variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Buscar CardFeatures
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog: Search CardFeatures */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar CardFeature</DialogTitle>
            <DialogDescription>
              Escolha um CardFeature para associar a este vídeo.
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

