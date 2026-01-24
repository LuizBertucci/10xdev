"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Plus, FileText, ChevronRight, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
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
import CardPost from "@/components/CardPost"
import CardFeatureForm from "@/components/CardFeatureForm"
import { useCardFeatures } from "@/hooks/useCardFeatures"
import { CardType } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"

interface PlatformState {
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

interface ContentsProps {
  platformState?: PlatformState
}

const ITEMS_PER_PAGE = 12

export default function Contents({ platformState }: ContentsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

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

  // Hook para posts (CardFeature com card_type='post')
  const cardFeatures = useCardFeatures(
    { initialPage, itemsPerPage: ITEMS_PER_PAGE },
    {
      selectedCardType: CardType.POST
    }
  )

  // Posts-only filters
  const [postSort, setPostSort] = useState<'updated' | 'recent' | 'az'>('updated')
  const [postCategory, setPostCategory] = useState<string>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isTagsOpen, setIsTagsOpen] = useState(false)

  const loading = cardFeatures.loading
  const error = cardFeatures.error

  // Sync URL with state
  useEffect(() => {
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
  }, [cardFeatures.currentPage, searchParams, router])

  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true
      return
    }
    cardFeatures.goToPage(1)
  }, [postSort, postCategory, selectedTags, cardFeatures.goToPage])

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

  const postCategories = useMemo(() => {
    const s = new Set<string>()
    for (const c of cardFeatures.items) {
      if (c.category) s.add(c.category)
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [cardFeatures.items])

  const postTagOptions = useMemo(() => {
    const tags = new Set<string>()
    for (const card of cardFeatures.items) {
      if (card.tags?.length) {
        card.tags.forEach(tag => tags.add(tag))
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b))
  }, [cardFeatures.items])

  const filteredPosts = useMemo(() => {
    let items = [...cardFeatures.items]
    if (postCategory !== 'all') {
      items = items.filter(item => item.category === postCategory)
    }
    if (selectedTags.length > 0) {
      items = items.filter(item => {
        const tags = item.tags || []
        return selectedTags.every(tag => tags.includes(tag))
      })
    }

    if (postSort === 'az') {
      items.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    } else if (postSort === 'recent') {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else {
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }

    return items
  }, [cardFeatures.items, postCategory, selectedTags, postSort])

  const hasPostFilters =
    !!cardFeatures.searchTerm ||
    postCategory !== 'all' ||
    selectedTags.length > 0 ||
    postSort !== 'updated'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
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

        {/* Title + Add Button */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Conteúdos</h1>
          {isAdmin && (
            <Button onClick={cardFeatures.startCreating} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" /> Adicionar conteúdo
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar conteúdos..."
            value={cardFeatures.searchTerm}
            onChange={(e) => cardFeatures.setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {/* Posts Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Select value={postSort} onValueChange={(v) => setPostSort(v as any)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Atualizados</SelectItem>
                <SelectItem value="recent">Recentes</SelectItem>
                <SelectItem value="az">A–Z</SelectItem>
              </SelectContent>
            </Select>

            <Select value={postCategory} onValueChange={setPostCategory}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {postCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap items-center gap-2">
              {selectedTags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}
                  <button
                    type="button"
                    onClick={() => setSelectedTags((prev) => prev.filter((x) => x !== t))}
                    className="ml-1 text-gray-600 hover:text-gray-900"
                    aria-label={`Remover tag ${t}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}

              <Popover open={isTagsOpen} onOpenChange={setIsTagsOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Tags
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[320px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar tags..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
                      <CommandGroup>
                      {postTagOptions.map((opt) => {
                          const selected = selectedTags.includes(opt)
                          return (
                            <CommandItem
                              key={opt}
                              value={opt}
                              onSelect={() => {
                                setSelectedTags((prev) => (prev.includes(opt) ? prev : [...prev, opt]))
                                setIsTagsOpen(false)
                              }}
                              disabled={selected}
                            >
                              <span className={selected ? "text-gray-400" : "text-gray-900"}>{opt}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {hasPostFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    cardFeatures.setSearchTerm("")
                    setPostSort("updated")
                    setPostCategory("all")
                    setSelectedTags([])
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
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
            Nenhum conteúdo adicionado
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

      {/* Contents Grid / Posts List */}
      {!loading && !error && filteredPosts.length > 0 && (
        <CardPost
          cardFeatures={filteredPosts}
          isAdmin={isAdmin}
          onCopyLink={async (url) => {
            try {
              await navigator.clipboard.writeText(url)
              toast({ title: "Link copiado!", description: "URL copiada para a área de transferência." })
            } catch {
              toast({ title: "Erro", description: "Não foi possível copiar o link.", variant: "destructive" })
            }
          }}
          onEdit={isAdmin ? (cardFeature) => cardFeatures.startEditing(cardFeature) : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
        />
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
          Mostrando {((cardFeatures.currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(cardFeatures.currentPage * ITEMS_PER_PAGE, cardFeatures.totalCount)} de {cardFeatures.totalCount} conteúdos
        </div>
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
