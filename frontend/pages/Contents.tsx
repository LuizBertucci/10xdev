"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Plus, FileText, Video, ChevronRight, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import AddContentSheet from "@/components/add-content-sheet"
import ContentCard from "@/components/ContentCard"
import PostsDenseList from "@/components/PostsDenseList"
import { contentService, ContentType, type Content } from "@/services/contentService"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"

interface PlatformState {
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

interface ContentsProps {
  platformState?: PlatformState
}

const CONTENT_TYPE_CONFIG = {
  [ContentType.VIDEO]: { label: 'Vídeos', icon: Video, emptyTitle: 'Nenhum vídeo adicionado', emptyDesc: 'Comece adicionando vídeos do YouTube' },
  [ContentType.POST]: { label: 'Posts', icon: FileText, emptyTitle: 'Nenhum post adicionado', emptyDesc: 'Comece criando posts com conteúdo rico' }
}

const ALLOWED_CONTENT_TYPES = [ContentType.VIDEO, ContentType.POST] as const

const ITEMS_PER_PAGE = 12

export default function Contents({ platformState }: ContentsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  // URL state
  const urlType = searchParams?.get('type') as ContentType | null
  const initialType = urlType && ALLOWED_CONTENT_TYPES.includes(urlType as (typeof ALLOWED_CONTENT_TYPES)[number])
    ? urlType
    : ContentType.VIDEO
  const initialPage = useMemo(() => {
    const p = Number(searchParams?.get('page') || 1)
    return Number.isFinite(p) && p > 0 ? Math.floor(p) : 1
  }, [searchParams])

  // Local state
  const [contents, setContents] = useState<Content[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<ContentType>(initialType)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const didInitRef = useRef(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editContent, setEditContent] = useState<Content | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; contentId: string | null }>({
    isOpen: false,
    contentId: null
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // Posts-only filters
  const [postSort, setPostSort] = useState<'updated' | 'recent' | 'az'>('updated')
  const [postCategory, setPostCategory] = useState<string>('all')
  const [postTagOptions, setPostTagOptions] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isTagsOpen, setIsTagsOpen] = useState(false)

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const config = CONTENT_TYPE_CONFIG[selectedType]
  const IconComponent = config.icon

  // Sync URL with state
  useEffect(() => {
    const currentTab = searchParams?.get('tab') || 'home'
    if (currentTab !== 'contents') return

    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('type', selectedType)
    if (currentPage > 1) {
      params.set('page', String(currentPage))
    } else {
      params.delete('page')
    }
    const qs = params.toString()
    const newUrl = qs ? `/?${qs}` : '/'
    const currentUrl = searchParams?.toString() ? `/?${searchParams.toString()}` : '/'
    
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [selectedType, currentPage, searchParams, router])

  // Load contents
  useEffect(() => {
    let isMounted = true

    const loadContents = async () => {
      setLoading(true)
      setError(null)
      try {
        const isPost = selectedType === ContentType.POST
        const sortBy = isPost ? (postSort === 'az' ? 'title' : postSort === 'recent' ? 'created_at' : 'updated_at') : undefined
        const sortOrder = isPost ? (postSort === 'az' ? 'asc' : 'desc') : undefined
        const res = await contentService.listContents({
          type: selectedType,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: search || undefined,
          category: isPost && postCategory !== 'all' ? postCategory : undefined,
          sortBy,
          sortOrder
        })
        if (isMounted) {
          if (res.success) {
            setContents(res.data || [])
            setTotalCount((res as any).count || 0)
          } else {
            setError(res.error || "Erro ao carregar conteúdos")
          }
        }
      } catch (e) {
        console.error('Erro ao carregar conteúdos:', e)
        if (isMounted) {
          const errorMessage = e && typeof e === 'object' && 'error' in e 
            ? (e as any).error 
            : e instanceof Error 
              ? e.message 
              : "Erro ao carregar conteúdos"
          setError(errorMessage || "Erro ao carregar conteúdos")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadContents()
    return () => { isMounted = false }
  }, [selectedType, currentPage, search, postSort, postCategory])

  useEffect(() => {
    // Evita resetar página no primeiro mount (quando vem ?page= na URL)
    if (!didInitRef.current) {
      didInitRef.current = true
      return
    }
    setCurrentPage(1)
    if (selectedType !== ContentType.POST) {
      setPostCategory('all')
      setSelectedTags([])
    }
  }, [selectedType, search])

  // Load post tag catalog (Posts only)
  useEffect(() => {
    if (selectedType !== ContentType.POST) return
    let mounted = true
    const load = async () => {
      const res = await contentService.listPostTags()
      if (mounted && res?.success) {
        setPostTagOptions((res.data || []).filter((t): t is string => typeof t === 'string'))
      }
    }
    load()
    return () => { mounted = false }
  }, [selectedType])

  const handleTypeChange = (type: string) => {
    if (!ALLOWED_CONTENT_TYPES.includes(type as (typeof ALLOWED_CONTENT_TYPES)[number])) {
      return
    }
    setSelectedType(type as ContentType)
  }

  const handleAdd = async (data: { title: string; url?: string; description?: string; markdownContent?: string; fileUrl?: string; tags?: string[] }) => {
    try {
      const res = await contentService.createContent({
        title: data.title,
        youtubeUrl: data.url,
        description: data.description,
        contentType: selectedType,
        markdownContent: data.markdownContent,
        fileUrl: data.fileUrl,
        tags: selectedType === ContentType.POST ? (data.tags || []) : undefined
      })
      if (res.success && res.data) {
        setContents(prev => [res.data!, ...prev])
        setTotalCount(prev => prev + 1)
        setIsAddOpen(false)
        toast({
          title: "Sucesso!",
          description: "Conteúdo adicionado com sucesso.",
        })
      } else {
        toast({
          title: "Erro",
          description: res.error || "Erro ao adicionar conteúdo.",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error('Erro ao adicionar conteúdo:', e)
      toast({
        title: "Erro",
        description: "Erro ao adicionar conteúdo.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (content: Content) => {
    setEditContent(content)
  }

  const handleUpdate = async (data: { title: string; url?: string; description?: string; markdownContent?: string; fileUrl?: string; tags?: string[] }) => {
    if (!editContent) return

    try {
      const res = await contentService.updateContent(editContent.id, {
        title: data.title,
        youtubeUrl: data.url,
        description: data.description,
        markdownContent: data.markdownContent,
        fileUrl: data.fileUrl,
        tags: selectedType === ContentType.POST ? (data.tags || []) : undefined
      })
      if (res.success && res.data) {
        setContents(prev => prev.map(c => c.id === editContent.id ? res.data! : c))
        setEditContent(null)
        toast({
          title: "Sucesso!",
          description: "Conteúdo atualizado com sucesso.",
        })
      } else {
        toast({
          title: "Erro",
          description: res.error || "Erro ao atualizar conteúdo.",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error('Erro ao atualizar conteúdo:', e)
      toast({
        title: "Erro",
        description: "Erro ao atualizar conteúdo.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, contentId: id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.contentId) return

    setIsDeleting(true)
    try {
      const res = await contentService.deleteContent(deleteConfirm.contentId)
      if (res.success) {
        setContents(prev => prev.filter(c => c.id !== deleteConfirm.contentId))
        setTotalCount(prev => prev - 1)
        toast({
          title: "Sucesso!",
          description: "Conteúdo excluído com sucesso.",
        })
      } else {
        toast({
          title: "Erro",
          description: res.error || "Erro ao excluir conteúdo.",
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

  const handleView = (id: string) => {
    const params = new URLSearchParams()
    params.set('tab', 'contents')
    params.set('type', selectedType)
    params.set('id', id)
    router.push(`/?${params.toString()}`)
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const postCategories = useMemo(() => {
    if (selectedType !== ContentType.POST) return []
    const s = new Set<string>()
    for (const c of contents) {
      if (c.category) s.add(c.category)
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [contents, selectedType])

  const filteredContents = useMemo(() => {
    if (selectedType !== ContentType.POST) return contents
    if (selectedTags.length === 0) return contents
    return contents.filter((c) => {
      const tags = c.tags || []
      return selectedTags.every((t) => tags.includes(t))
    })
  }, [contents, selectedType, selectedTags])

  const hasPostFilters = selectedType === ContentType.POST && (search || postCategory !== 'all' || selectedTags.length > 0 || postSort !== 'updated')

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
            <Button onClick={() => setIsAddOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" /> Adicionar {config.label.slice(0, -1)}
            </Button>
          )}
        </div>

        {/* Sub-tabs */}
        <Tabs value={selectedType} onValueChange={handleTypeChange} className="w-full">
          <TabsList className="h-10 w-full grid grid-cols-2 bg-gray-100 p-1 rounded-lg border border-gray-200/50">
            {ALLOWED_CONTENT_TYPES.map((type) => {
              const cfg = CONTENT_TYPE_CONFIG[type]
              const Icon = cfg.icon
              return (
                <TabsTrigger 
                  key={type}
                  value={type} 
                  className="text-xs sm:text-sm h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  disabled={loading}
                >
                  <div className="flex items-center justify-center">
                    <Icon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{cfg.label}</span>
                  </div>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={`Buscar ${config.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {/* Posts Filters */}
        {selectedType === ContentType.POST && (
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
                    setSearch("")
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
        )}
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
      {!loading && !error && contents.length === 0 && !search && selectedType !== ContentType.POST && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <IconComponent className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {config.emptyTitle}
          </h3>
          <p className="text-gray-600 mb-6">
            {config.emptyDesc}
          </p>
        </div>
      )}

      {!loading && !error && selectedType === ContentType.POST && contents.length === 0 && !hasPostFilters && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <IconComponent className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {config.emptyTitle}
          </h3>
          <p className="text-gray-600 mb-6">
            {config.emptyDesc}
          </p>
        </div>
      )}

      {/* Empty Search */}
      {!loading && !error && selectedType !== ContentType.POST && contents.length === 0 && search && (
        <div className="text-center py-12">
          <IconComponent className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum resultado encontrado
          </h3>
          <p className="text-gray-600">
            Tente ajustar sua busca
          </p>
        </div>
      )}

      {!loading && !error && selectedType === ContentType.POST && filteredContents.length === 0 && hasPostFilters && (
        <div className="text-center py-12">
          <IconComponent className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum resultado encontrado
          </h3>
          <p className="text-gray-600">
            Tente ajustar seus filtros de busca
          </p>
        </div>
      )}

      {/* Contents Grid / Posts List */}
      {!loading && !error && filteredContents.length > 0 && (
        selectedType === ContentType.POST ? (
          <PostsDenseList
            contents={filteredContents}
            isAdmin={isAdmin}
            onCopyLink={async (fileUrl) => {
              try {
                await navigator.clipboard.writeText(fileUrl)
                toast({ title: "Link copiado!", description: "URL copiada para a área de transferência." })
              } catch {
                toast({ title: "Erro", description: "Não foi possível copiar o link.", variant: "destructive" })
              }
            }}
            onEdit={isAdmin ? handleEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onView={handleView}
                onEdit={isAdmin ? handleEdit : undefined}
                onDelete={isAdmin ? handleDelete : undefined}
              />
            ))}
          </div>
        )
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1 pl-2.5"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  <span>Anterior</span>
                </Button>
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <Button
                      variant={currentPage === pageNum ? "outline" : "ghost"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="min-w-[2.5rem]"
                    >
                      {pageNum}
                    </Button>
                  </PaginationItem>
                )
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
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
      {!loading && !error && totalCount > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount} {config.label.toLowerCase()}
        </div>
      )}

      {/* Add Content Modal */}
      <AddContentSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAdd}
        contentType={selectedType}
      />

      {/* Edit Content Modal */}
      <AddContentSheet
        isOpen={!!editContent}
        onClose={() => setEditContent(null)}
        onSubmit={handleUpdate}
        editMode={true}
        contentType={selectedType}
        initialData={editContent ? {
          title: editContent.title,
          url: editContent.youtubeUrl,
          description: editContent.description,
          markdownContent: editContent.markdownContent,
          fileUrl: editContent.fileUrl,
          tags: editContent.tags || []
        } : undefined}
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
