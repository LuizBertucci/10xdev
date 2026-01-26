"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Plus, FileText, ChevronRight, Video } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Pagination, PaginationContent, PaginationItem, PaginationEllipsis } from "@/components/ui/pagination"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import CardFeatureForm from "@/components/CardFeatureForm"
import TrainingVideoForm from "@/components/TrainingVideoForm"
import TrainingVideoModal from "@/components/TrainingVideoModal"
import { useCardFeatures } from "@/hooks/useCardFeatures"
import { CardType } from "@/types"
import { ContentType as TrainingContentType, type TrainingVideo, type CreateTrainingVideoData } from "@/types/training"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { apiClient } from "@/services"
import { getYouTubeThumbnail } from "@/utils/youtube"

interface PlatformState {
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

interface ContentsProps {
  platformState?: PlatformState
}

type ContentTab = 'posts' | 'videos'

const ITEMS_PER_PAGE = 12

export default function Contents({ platformState }: ContentsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const initialContentTab = useMemo<ContentTab>(() => {
    const tabParam = searchParams?.get('contentTab')
    return tabParam === 'videos' ? 'videos' : 'posts'
  }, [searchParams])

  const initialPage = useMemo(() => {
    const p = Number(searchParams?.get('page') || 1)
    return Number.isFinite(p) && p > 0 ? Math.floor(p) : 1
  }, [searchParams])

  const didInitRef = useRef(false)
  const pendingContentTabRef = useRef<ContentTab | null>(null)
  const [contentTab, setContentTab] = useState<ContentTab>(initialContentTab)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; contentId: string | null }>({
    isOpen: false,
    contentId: null
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const [videoItems, setVideoItems] = useState<TrainingVideo[]>([])
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoSearchTerm, setVideoSearchTerm] = useState('')
  const [videoPage, setVideoPage] = useState(initialPage)
  const [videoTotalCount, setVideoTotalCount] = useState(0)
  const [videoFormOpen, setVideoFormOpen] = useState(false)
  const [videoFormMode, setVideoFormMode] = useState<'create' | 'edit'>('create')
  const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null)
  const [videoFormLoading, setVideoFormLoading] = useState(false)

  // Hook para posts (CardFeature com card_type='post')
  const cardFeatures = useCardFeatures(
    { initialPage, itemsPerPage: ITEMS_PER_PAGE },
    {
      selectedCardType: CardType.POST
    }
  )

  // Posts-only filters

  const loading = cardFeatures.loading
  const error = cardFeatures.error
  const videoTotalPages = Math.max(1, Math.ceil(videoTotalCount / ITEMS_PER_PAGE))

  useEffect(() => {
    const param = searchParams?.get('contentTab')
    const nextTab = param === 'videos' ? 'videos' : 'posts'

    if (pendingContentTabRef.current && pendingContentTabRef.current !== nextTab) {
      return
    }
    pendingContentTabRef.current = null

    if (nextTab !== contentTab) {
      setContentTab(nextTab)
    }
  }, [searchParams, contentTab])

  // Sync URL with state
  useEffect(() => {
    const currentTab = searchParams?.get('tab') || 'home'
    if (currentTab !== 'contents') return

    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('type')
    if (contentTab === 'videos') {
      params.set('contentTab', 'videos')
    } else {
      params.delete('contentTab')
    }
    const activePage = contentTab === 'videos' ? videoPage : cardFeatures.currentPage
    if (activePage > 1) {
      params.set('page', String(activePage))
    } else {
      params.delete('page')
    }
    const qs = params.toString()
    const newUrl = qs ? `/?${qs}` : '/'
    const currentUrl = searchParams?.toString() ? `/?${searchParams.toString()}` : '/'

    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [cardFeatures.currentPage, contentTab, videoPage, searchParams, router])

  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true
      return
    }
    cardFeatures.goToPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadVideos = useCallback(async (page = videoPage, search = videoSearchTerm) => {
    setVideoLoading(true)
    setVideoError(null)
    try {
      const response = await apiClient.get<TrainingVideo[]>('/contents', {
        page,
        limit: ITEMS_PER_PAGE,
        type: TrainingContentType.VIDEO,
        search
      })
      if (response?.success) {
        setVideoItems(response.data || [])
        setVideoTotalCount(response.count || 0)
      } else {
        setVideoItems([])
        setVideoTotalCount(0)
        setVideoError(response?.error || 'Erro ao carregar vídeos.')
      }
    } catch (e: any) {
      setVideoItems([])
      setVideoTotalCount(0)
      setVideoError(e?.error || 'Erro ao carregar vídeos.')
    } finally {
      setVideoLoading(false)
    }
  }, [videoPage, videoSearchTerm])

  useEffect(() => {
    if (contentTab !== 'videos') return
    loadVideos()
  }, [contentTab, loadVideos])

  useEffect(() => {
    if (contentTab !== 'videos') return
    setVideoPage(1)
  }, [videoSearchTerm, contentTab])

  const handleCreatePost = async (data: any) => {
    const payload = {
      ...data,
      card_type: CardType.POST
    }
    return await cardFeatures.createCardFeature(payload)
  }

  const handleUpdatePost = async (data: any) => {
    if (!cardFeatures.editingItem) return null
    const payload = {
      ...data,
      card_type: CardType.POST
    }
    return await cardFeatures.updateCardFeature(cardFeatures.editingItem.id, payload)
  }

  const handleContentTabChange = (tab: ContentTab) => {
    if (tab === contentTab) return
    pendingContentTabRef.current = tab
    setContentTab(tab)
    if (tab === 'posts') {
      cardFeatures.goToPage(1)
    } else {
      setVideoPage(1)
    }
  }

  const openCreateVideo = () => {
    setVideoFormMode('create')
    setEditingVideo(null)
    setVideoFormOpen(true)
  }

  const openEditVideo = (video: TrainingVideo) => {
    setVideoFormMode('edit')
    setEditingVideo(video)
    setVideoFormOpen(true)
  }

  const handleSubmitVideo = async (data: CreateTrainingVideoData) => {
    setVideoFormLoading(true)
    try {
      const payload = {
        ...data,
        contentType: TrainingContentType.VIDEO
      }
      const response = videoFormMode === 'edit' && editingVideo
        ? await apiClient.put<TrainingVideo>(`/contents/${editingVideo.id}`, payload)
        : await apiClient.post<TrainingVideo>('/contents', payload)

      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao salvar vídeo.')
      }

      toast({
        title: "Sucesso!",
        description: videoFormMode === 'edit' ? "Vídeo atualizado com sucesso." : "Vídeo criado com sucesso.",
      })
      setVideoFormOpen(false)
      setEditingVideo(null)
      setVideoPage(1)
      await loadVideos(1)
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e?.message || "Erro ao salvar vídeo.",
        variant: "destructive",
      })
    } finally {
      setVideoFormLoading(false)
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!videoId) return
    try {
      const response = await apiClient.delete<null>(`/contents/${videoId}`)
      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao excluir vídeo.')
      }
      toast({
        title: "Sucesso!",
        description: "Vídeo excluído com sucesso.",
      })
      await loadVideos()
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e?.message || "Erro ao excluir vídeo.",
        variant: "destructive",
      })
    }
  }

  const handleOpenVideoModal = (video: TrainingVideo) => {
    setSelectedVideo(video)
    setVideoModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, contentId: id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.contentId) return

    setIsDeleting(true)
    try {
      const success = await cardFeatures.deleteCardFeature(deleteConfirm.contentId)
      if (success) {
        toast({
          title: "Sucesso!",
          description: "Conteúdo excluído com sucesso.",
        })
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir conteúdo.",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error('Erro ao deletar conteúdo:', e)
      toast({
        title: "Erro",
        description: "Erro ao excluir conteúdo.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({ isOpen: false, contentId: null })
    }
  }

  const filteredPosts = useMemo(() => {
    const items = [...cardFeatures.items]
    return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [cardFeatures.items])

  const hasPostFilters = !!cardFeatures.searchTerm
  const hasVideoFilters = !!videoSearchTerm

  return (
    <div className="space-y-6 w-full overflow-x-hidden px-1">
      {/* Header */}
      <div className="space-y-4 w-full max-w-[900px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm">
          <button
            type="button"
            onClick={() => router.push('/?tab=home')}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
          >
            Início
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <button
            type="button"
            onClick={() => router.push('/?tab=contents')}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
          >
            Conteúdos
          </button>
        </div>

        <Tabs value={contentTab} onValueChange={(value) => handleContentTabChange(value as ContentTab)} className="w-full">
          <TabsList className="h-9 w-full sm:w-auto grid grid-cols-2 bg-gray-100 p-1 rounded-lg border border-gray-200/50">
            <TabsTrigger value="posts" className="text-xs sm:text-sm font-semibold">
              Posts
            </TabsTrigger>
            <TabsTrigger value="videos" className="text-xs sm:text-sm font-semibold">
              Vídeos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search + Add Button (compact like Codes) */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={contentTab === 'videos' ? "Buscar vídeos..." : "Buscar conteúdos..."}
              value={contentTab === 'videos' ? videoSearchTerm : cardFeatures.searchTerm}
              onChange={(e) => {
                if (contentTab === 'videos') {
                  setVideoSearchTerm(e.target.value)
                } else {
                  cardFeatures.setSearchTerm(e.target.value)
                }
              }}
              className="pl-10 pr-10 w-full h-10"
            />
          </div>

          {isAdmin && (
            <Button
              onClick={contentTab === 'videos' ? openCreateVideo : cardFeatures.startCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap px-2 sm:px-4"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="sm:hidden">{contentTab === 'videos' ? 'Vídeo' : 'Criar'}</span>
              <span className="hidden sm:inline">
                {contentTab === 'videos' ? 'Adicionar vídeo' : 'Adicionar conteúdo'}
              </span>
            </Button>
          )}
        </div>

        {/* Filters removed */}
      </div>

      {contentTab === 'posts' && (
        <>
          {/* Loading */}
          {loading && (
            <div className="w-full max-w-[900px] mx-auto bg-gray-200 rounded-full h-2 mb-6">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="w-full max-w-[900px] mx-auto text-red-600">{error}</div>
          )}

          {/* Empty State */}
          {!loading && !error && cardFeatures.items.length === 0 && !hasPostFilters && (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center w-full max-w-[900px] mx-auto">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum conteúdo adicionado
              </h3>
              <p className="text-gray-600 mb-6">
                Comece criando posts com blocos e links do YouTube.
              </p>
            </div>
          )}

          {/* Empty Search */}
          {!loading && !error && filteredPosts.length === 0 && hasPostFilters && (
            <div className="text-center py-12 w-full max-w-[900px] mx-auto">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum resultado encontrado
              </h3>
              <p className="text-gray-600">
                Tente ajustar seus filtros de busca
              </p>
            </div>
          )}

          {/* Contents Grid / Posts List */}
          {!loading && !error && filteredPosts.length > 0 && (
            <div className="space-y-4 w-full max-w-[900px] mx-auto">
              {filteredPosts.map((post) => (
                <CardFeatureCompact
                  key={post.id}
                  snippet={post}
                  onEdit={(snippet) => cardFeatures.startEditing(snippet)}
                  onDelete={(snippetId) => handleDelete(snippetId)}
                  onUpdate={cardFeatures.updateCardFeature}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && cardFeatures.totalPages > 1 && (
            <div className="mt-8 flex justify-center w-full max-w-[900px] mx-auto">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cardFeatures.prevPage()}
                      disabled={!cardFeatures.hasPrevPage}
                      className="gap-1 pl-2.5"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                      <span>Anterior</span>
                    </Button>
                  </PaginationItem>

                  {Array.from({ length: Math.min(5, cardFeatures.totalPages) }, (_, i) => {
                    let pageNum: number
                    if (cardFeatures.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (cardFeatures.currentPage <= 3) {
                      pageNum = i + 1
                    } else if (cardFeatures.currentPage >= cardFeatures.totalPages - 2) {
                      pageNum = cardFeatures.totalPages - 4 + i
                    } else {
                      pageNum = cardFeatures.currentPage - 2 + i
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <Button
                          variant={cardFeatures.currentPage === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => cardFeatures.goToPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      </PaginationItem>
                    )
                  })}

                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cardFeatures.nextPage()}
                      disabled={!cardFeatures.hasNextPage}
                      className="gap-1 pr-2.5"
                    >
                      <span>Próxima</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* Pagination Info */}
          {!loading && !error && cardFeatures.totalCount > 0 && (
            <div className="mt-4 text-center text-sm text-gray-600 w-full max-w-[900px] mx-auto">
              Mostrando {((cardFeatures.currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(cardFeatures.currentPage * ITEMS_PER_PAGE, cardFeatures.totalCount)} de {cardFeatures.totalCount} conteúdos
            </div>
          )}
        </>
      )}

      {contentTab === 'videos' && (
        <>
          {/* Loading */}
          {videoLoading && (
            <div className="w-full max-w-[900px] mx-auto bg-gray-200 rounded-full h-2 mb-6">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          )}

          {/* Error */}
          {!videoLoading && videoError && (
            <div className="w-full max-w-[900px] mx-auto text-red-600">{videoError}</div>
          )}

          {/* Empty State */}
          {!videoLoading && !videoError && videoItems.length === 0 && !hasVideoFilters && (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center w-full max-w-[900px] mx-auto">
              <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum vídeo adicionado
              </h3>
              <p className="text-gray-600 mb-6">
                Adicione vídeos do YouTube para organizar seus treinamentos.
              </p>
            </div>
          )}

          {/* Empty Search */}
          {!videoLoading && !videoError && videoItems.length === 0 && hasVideoFilters && (
            <div className="text-center py-12 w-full max-w-[900px] mx-auto">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum resultado encontrado
              </h3>
              <p className="text-gray-600">
                Tente ajustar seus filtros de busca
              </p>
            </div>
          )}

          {/* Videos Grid */}
          {!videoLoading && !videoError && videoItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-[900px] mx-auto">
              {videoItems.map((video) => {
                const thumbnail = video.thumbnail || (video.videoId ? getYouTubeThumbnail(video.videoId) : undefined)
                const createdAt = new Date(video.createdAt).toLocaleDateString("pt-BR")
                return (
                  <div key={video.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                    <button
                      type="button"
                      onClick={() => handleOpenVideoModal(video)}
                      className="text-left w-full"
                    >
                      <div className="relative aspect-video bg-gray-100">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={video.title}
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <Video className="h-10 w-10" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{video.title}</h3>
                        {video.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {video.category && (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                              {video.category}
                            </Badge>
                          )}
                          {video.tags?.map((tag, index) => (
                            <Badge key={`${video.id}-tag-${index}`} variant="secondary" className="text-[10px] px-2 py-0.5">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">Adicionado em {createdAt}</div>
                      </div>
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-2 px-4 pb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditVideo(video)
                          }}
                          className="flex-1"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Tem certeza que deseja excluir este vídeo?')) {
                              handleDeleteVideo(video.id)
                            }
                          }}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {!videoLoading && !videoError && videoTotalPages > 1 && (
            <div className="mt-8 flex justify-center w-full max-w-[900px] mx-auto">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVideoPage((prev) => Math.max(1, prev - 1))}
                      disabled={videoPage <= 1}
                      className="gap-1 pl-2.5"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                      <span>Anterior</span>
                    </Button>
                  </PaginationItem>

                  {Array.from({ length: Math.min(5, videoTotalPages) }, (_, i) => {
                    let pageNum: number
                    if (videoTotalPages <= 5) {
                      pageNum = i + 1
                    } else if (videoPage <= 3) {
                      pageNum = i + 1
                    } else if (videoPage >= videoTotalPages - 2) {
                      pageNum = videoTotalPages - 4 + i
                    } else {
                      pageNum = videoPage - 2 + i
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <Button
                          variant={videoPage === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setVideoPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      </PaginationItem>
                    )
                  })}

                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVideoPage((prev) => Math.min(videoTotalPages, prev + 1))}
                      disabled={videoPage >= videoTotalPages}
                      className="gap-1 pr-2.5"
                    >
                      <span>Próxima</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* Pagination Info */}
          {!videoLoading && !videoError && videoTotalCount > 0 && (
            <div className="mt-4 text-center text-sm text-gray-600 w-full max-w-[900px] mx-auto">
              Mostrando {((videoPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(videoPage * ITEMS_PER_PAGE, videoTotalCount)} de {videoTotalCount} vídeos
            </div>
          )}
        </>
      )}

      {/* Create Post Modal */}
      {(!!user) && (
        <CardFeatureForm
          isOpen={cardFeatures.isCreating}
          mode="create"
          isLoading={cardFeatures.creating}
          onClose={cardFeatures.cancelCreating}
          onSubmit={handleCreatePost}
          isAdmin={isAdmin}
          forcedCardType={CardType.POST}
        />
      )}

      {/* Edit Post Modal */}
      {(!!user) && (
        <CardFeatureForm
          isOpen={cardFeatures.isEditing}
          mode="edit"
          initialData={cardFeatures.editingItem || undefined}
          isLoading={cardFeatures.updating}
          onClose={cardFeatures.cancelEditing}
          onSubmit={handleUpdatePost}
          isAdmin={isAdmin}
          forcedCardType={CardType.POST}
        />
      )}

      {/* Video Form Modal */}
      {(!!user) && (
        <TrainingVideoForm
          isOpen={videoFormOpen}
          mode={videoFormMode}
          initialData={editingVideo || undefined}
          isLoading={videoFormLoading}
          onClose={() => {
            setVideoFormOpen(false)
            setEditingVideo(null)
          }}
          onSubmit={handleSubmitVideo}
        />
      )}

      {/* Video Preview Modal */}
      <TrainingVideoModal
        isOpen={videoModalOpen}
        video={selectedVideo}
        onClose={() => setVideoModalOpen(false)}
        onEdit={isAdmin ? openEditVideo : undefined}
        onDelete={isAdmin ? handleDeleteVideo : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(open) => !isDeleting && setDeleteConfirm({ isOpen: open, contentId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este conteúdo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
