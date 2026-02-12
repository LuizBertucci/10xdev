"use client"

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Plus, FileText, ChevronRight, Video, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import CardFeatureForm from "@/components/CardFeatureForm"
import CardTutorial from "@/components/CardTutorial"
import TutorialForm from "@/components/TutorialForm"
import { useCardFeatures } from "@/hooks/useCardFeatures"
import { contentService } from "@/services"
import { CardType } from "@/types"
import type { Content } from "@/types/content"
import type { CreateCardFeatureData } from "@/types/cardfeature"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"

const ITEMS_PER_PAGE = 12

// Memoized AddPostButton component - prevents re-renders when parent changes
interface AddPostButtonProps {
  onClick: () => void
  disabled: boolean
  isAdmin: boolean
}

const AddPostButton = React.memo(function AddPostButton({ onClick, disabled, isAdmin }: AddPostButtonProps) {
  if (!isAdmin) return null

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap px-2 sm:px-4"
      size="sm"
    >
      <Plus className="h-4 w-4 mr-1" />
      <span className="sm:hidden">Criar</span>
      <span className="hidden sm:inline">Adicionar post</span>
    </Button>
  )
}, (prevProps, nextProps) => {
  if (prevProps.disabled !== nextProps.disabled) return false
  if (prevProps.isAdmin !== nextProps.isAdmin) return false
  if (prevProps.onClick !== nextProps.onClick) return false
  return true
})

// Memoized AddTutorialButton component - prevents re-renders when parent changes
interface AddTutorialButtonProps {
  onClick: () => void
  disabled: boolean
  isAdmin: boolean
}

const AddTutorialButton = React.memo(function AddTutorialButton({ onClick, disabled, isAdmin }: AddTutorialButtonProps) {
  if (!isAdmin) return null

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="bg-rose-500 hover:bg-rose-600 text-white whitespace-nowrap px-2 sm:px-4"
      size="sm"
    >
      <Plus className="h-4 w-4 mr-1" />
      <span className="sm:hidden">Criar</span>
      <span className="hidden sm:inline">Adicionar tutorial</span>
    </Button>
  )
}, (prevProps, nextProps) => {
  if (prevProps.disabled !== nextProps.disabled) return false
  if (prevProps.isAdmin !== nextProps.isAdmin) return false
  if (prevProps.onClick !== nextProps.onClick) return false
  return true
})

export default function Contents() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  // Get contentsTab from URL (defaults to 'posts')
  const contentsTab = searchParams?.get('contentsTab') || 'posts'

  const initialPage = useMemo(() => {
    const p = Number(searchParams?.get('page') || 1)
    return Number.isFinite(p) && p > 0 ? Math.floor(p) : 1
  }, [searchParams])

  const didInitRef = useRef(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; contentId: string | null }>({
    isOpen: false,
    contentId: null
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // ================================================
  // POSTS STATE (CardFeatures with card_type='post')
  // ================================================
  const cardFeatures = useCardFeatures(
    { initialPage, itemsPerPage: ITEMS_PER_PAGE },
    { selectedCardType: CardType.POST }
  )

  // ================================================
  // TUTORIALS STATE (Contents with content_type='video')
  // ================================================
  const [tutorials, setTutorials] = useState<Content[]>([])
  const [tutorialsLoading, setTutorialsLoading] = useState(false)
  const [tutorialsError, setTutorialsError] = useState<string | null>(null)
  const [tutorialsSearch, setTutorialsSearch] = useState("")
  const [createTutorialOpen, setCreateTutorialOpen] = useState(false)

  // Fetch tutorials when tab is active
  useEffect(() => {
    if (contentsTab !== 'tutorials') return

    const fetchTutorials = async () => {
      setTutorialsLoading(true)
      setTutorialsError(null)
      try {
        const res = await contentService.getTutorials({ limit: 100 })
        if (res?.success && res.data) {
          setTutorials(res.data)
        } else {
          setTutorialsError(res?.error || "Erro ao carregar tutoriais")
        }
      } catch {
        setTutorialsError("Erro ao carregar tutoriais")
      } finally {
        setTutorialsLoading(false)
      }
    }

    fetchTutorials()
  }, [contentsTab])

  // Filter tutorials by search
  const filteredTutorials = useMemo(() => {
    if (!tutorialsSearch.trim()) return tutorials
    const term = tutorialsSearch.toLowerCase()
    return tutorials.filter(t => 
      t.title.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term) ||
      t.category?.toLowerCase().includes(term) ||
      t.tags?.some(tag => tag.toLowerCase().includes(term))
    )
  }, [tutorials, tutorialsSearch])

  const loading = cardFeatures.loading
  const error = cardFeatures.error

  // Handle tab change
  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', 'contents')
    if (value === 'posts') {
      params.delete('contentsTab')
    } else {
      params.set('contentsTab', value)
    }
    params.delete('page')
    params.delete('id')
    router.push(`/?${params.toString()}`)
  }, [router, searchParams])

  // Handle tutorial click
  const handleTutorialClick = useCallback((tutorial: Content) => {
    router.push(`/contents/${tutorial.id}?contentsTab=tutorials`)
  }, [router])

  // Sync URL with state (posts pagination)
  useEffect(() => {
    if (contentsTab !== 'posts') return
    const currentTab = searchParams?.get('tab') || 'home'
    if (currentTab !== 'contents') return

    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('type')
    if (cardFeatures.currentPage > 1) {
      params.set('page', String(cardFeatures.currentPage))
    } else {
      params.delete('page')
    }
    const qs = params.toString()
    const newUrl = qs ? `/?${qs}` : '/'
    const currentUrl = searchParams?.toString() ? `/?${searchParams.toString()}` : '/'

    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [cardFeatures.currentPage, searchParams, router, contentsTab])

  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true
      return
    }
    if (contentsTab === 'posts') {
      cardFeatures.goToPage(1)
    }
  }, [cardFeatures.goToPage, contentsTab])

  const handleCreatePost = async (data: Record<string, unknown>) => {
    const payload = { ...data, card_type: CardType.POST as const }
    return await cardFeatures.createCardFeature(payload as CreateCardFeatureData)
  }

  const handleUpdatePost = async (data: Record<string, unknown>) => {
    if (!cardFeatures.editingItem) return null
    const payload = { ...data, card_type: CardType.POST as const }
    return await cardFeatures.updateCardFeature(cardFeatures.editingItem.id, payload as Partial<CreateCardFeatureData>)
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
        toast({ title: "Sucesso!", description: "Conteúdo excluído com sucesso." })
      } else {
        toast({ title: "Erro", description: "Erro ao excluir conteúdo.", variant: "destructive" })
      }
    } catch (e) {
      console.error('Erro ao deletar conteúdo:', e)
      toast({ title: "Erro", description: "Erro ao excluir conteúdo.", variant: "destructive" })
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

  // Memoized callback for add post button
  const handleAddPostClick = useCallback(() => {
    cardFeatures.startCreating()
  }, [cardFeatures.startCreating])

  // Memoized callback for add tutorial button
  const handleAddTutorialClick = useCallback(() => {
    setCreateTutorialOpen(true)
  }, [setCreateTutorialOpen])

  return (
    <div className="space-y-6 w-full overflow-x-hidden px-1">
      {/* Header */}
      <div className="space-y-4 w-full max-w-[900px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm">
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
          >
            Início
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">
            Conteúdos
          </span>
        </div>

        {/* Tabs */}
        <Tabs value={contentsTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-auto p-1 bg-gray-100 rounded-xl gap-2">
            <TabsTrigger 
              value="posts" 
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200"
            >
              <FileText className="h-5 w-5" />
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="tutorials" 
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200"
            >
              <Video className="h-5 w-5" />
              Tutoriais
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab Content */}
          <TabsContent value="posts" className="mt-6">
            {/* Search + Add Button */}
            <div className="flex items-center gap-2 mb-6">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar posts..."
                  value={cardFeatures.searchTerm}
                  onChange={(e) => cardFeatures.setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 w-full h-10"
                />
              </div>
              <AddPostButton
                onClick={handleAddPostClick}
                disabled={cardFeatures.loading || cardFeatures.creating}
                isAdmin={isAdmin}
              />
            </div>

            {/* Loading */}
            {loading && (
              <div className="bg-gray-200 rounded-full h-2 mb-6">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="text-red-600">{error}</div>
            )}

            {/* Empty State */}
            {!loading && !error && cardFeatures.items.length === 0 && !hasPostFilters && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum post adicionado
                </h3>
                <p className="text-gray-600 mb-6">
                  Comece criando posts com blocos e links do YouTube.
                </p>
              </div>
            )}

            {/* Empty Search */}
            {!loading && !error && filteredPosts.length === 0 && hasPostFilters && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum resultado encontrado
                </h3>
                <p className="text-gray-600">
                  Tente ajustar seus filtros de busca
                </p>
              </div>
            )}

            {/* Posts List */}
            {!loading && !error && filteredPosts.length > 0 && (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <CardFeatureCompact
                    key={post.id}
                    snippet={post}
                    onEdit={(snippet) => cardFeatures.startEditing(snippet)}
                    onDelete={(snippetId) => handleDelete(snippetId)}
                    onUpdate={cardFeatures.updateCardFeature}
                    expandOnClick
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && cardFeatures.totalPages > 1 && (
              <div className="mt-8 flex justify-center">
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
              <div className="mt-4 text-center text-sm text-gray-600">
                Mostrando {((cardFeatures.currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(cardFeatures.currentPage * ITEMS_PER_PAGE, cardFeatures.totalCount)} de {cardFeatures.totalCount} posts
              </div>
            )}
          </TabsContent>

          {/* Tutorials Tab Content */}
          <TabsContent value="tutorials" className="mt-6">
            {/* Search + Add Button */}
            <div className="flex items-center gap-2 mb-6">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar tutoriais..."
                  value={tutorialsSearch}
                  onChange={(e) => setTutorialsSearch(e.target.value)}
                  className="pl-10 pr-10 w-full h-10"
                />
              </div>
              <AddTutorialButton
                onClick={handleAddTutorialClick}
                disabled={tutorialsLoading}
                isAdmin={isAdmin}
              />
            </div>

            {/* Loading */}
            {tutorialsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}

            {/* Error */}
            {!tutorialsLoading && tutorialsError && (
              <div className="text-red-600">{tutorialsError}</div>
            )}

            {/* Empty State */}
            {!tutorialsLoading && !tutorialsError && tutorials.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum tutorial disponível
                </h3>
                <p className="text-gray-600">
                  Os tutoriais aparecerão aqui quando forem adicionados.
                </p>
              </div>
            )}

            {/* Empty Search */}
            {!tutorialsLoading && !tutorialsError && tutorials.length > 0 && filteredTutorials.length === 0 && (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum tutorial encontrado
                </h3>
                <p className="text-gray-600">
                  Tente ajustar sua busca
                </p>
              </div>
            )}

            {/* Tutorials Grid */}
            {!tutorialsLoading && !tutorialsError && filteredTutorials.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTutorials.map((tutorial) => (
                  <CardTutorial
                    key={tutorial.id}
                    tutorial={tutorial}
                    onClick={handleTutorialClick}
                  />
                ))}
              </div>
            )}

            {/* Tutorial Count */}
            {!tutorialsLoading && !tutorialsError && filteredTutorials.length > 0 && (
              <div className="mt-6 text-center text-sm text-gray-600">
                {filteredTutorials.length} {filteredTutorials.length === 1 ? 'tutorial' : 'tutoriais'}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

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

      {/* Create Tutorial Form */}
      <TutorialForm
        isOpen={createTutorialOpen}
        onClose={() => setCreateTutorialOpen(false)}
        mode="create"
        onSuccess={(newTutorial) => {
          setTutorials(prev => [newTutorial, ...prev])
        }}
      />
    </div>
  )
}
