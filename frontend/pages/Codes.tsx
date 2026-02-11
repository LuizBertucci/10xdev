import React, { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ChevronRight, ChevronDown, Code2, X, ShieldCheck, BadgeCheck, Plus, FileJson, Globe, Lock, Link2, User, Pencil, Trash2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCardFeatures } from "@/hooks/useCardFeatures"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import CardFeatureForm from "@/components/CardFeatureForm"
import CardFeatureFormJSON from "@/components/CardFeatureFormJSON"
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog"
import { Pagination, PaginationContent, PaginationItem, PaginationEllipsis } from "@/components/ui/pagination"
import type { CardFeature as CardFeatureType, CreateCardFeatureData } from "@/types"
import { ApprovalStatus, Visibility } from "@/types"
import { useAuth } from "@/hooks/useAuth"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cardFeatureService } from "@/services"
import { toast } from "sonner"
import { getMacroCategoryStats, getMacroCategory } from "@/utils/macroCategories"

interface PlatformState {
  activeTab?: string
  setActiveTab?: (tab: string) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedTech: string
  setSelectedTech: (tech: string) => void
  filteredSnippets: (snippets: CardFeatureType[]) => CardFeatureType[]
}

interface CodesProps {
  platformState?: PlatformState
}

// Memoized CreateCardButton component - prevents flickering when parent re-renders
interface CreateCardButtonProps {
  onClick: () => void
  onCreateJson: () => void
  disabled: boolean
  loading: boolean
  creating: boolean
  isSelectionMode: boolean
  isVisible: boolean
}

const CreateCardButton = React.memo(function CreateCardButton({
  onClick,
  onCreateJson,
  disabled,
  loading,
  creating,
  isSelectionMode,
  isVisible
}: CreateCardButtonProps) {
  const buttonDisabled = disabled || loading || creating || isSelectionMode
  const buttonText = creating ? 'Criando...' : 'Novo card'

  return (
    <div className={`flex flex-shrink-0 ${isVisible ? '' : 'hidden'}`}>
      <Button
        onClick={onClick}
        disabled={buttonDisabled}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap rounded-r-none px-2 sm:px-4"
      >
        <Plus className="h-4 w-4 mr-1" />
        <span className="sm:hidden">{creating ? 'Criando...' : 'Criar'}</span>
        <span className="hidden sm:inline">{buttonText}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={buttonDisabled}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-l-none border-l border-blue-500 px-2"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCreateJson}>
            <FileJson className="h-4 w-4 mr-2" />
            Criar via JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}, (prevProps, nextProps) => {
  // Skip re-render if props that affect rendering haven't changed
  // Return true to skip re-render, false to re-render
  const isVisibleChanged = prevProps.isVisible !== nextProps.isVisible
  const isVisibleNowVisible = nextProps.isVisible

  // Always re-render when becoming visible to show the button
  if (isVisibleChanged && isVisibleNowVisible) return false

  // Skip re-render if only these specific props changed
  if (prevProps.disabled !== nextProps.disabled) return false
  if (prevProps.loading !== nextProps.loading) return false
  if (prevProps.creating !== nextProps.creating) return false
  if (prevProps.isSelectionMode !== nextProps.isSelectionMode) return false
  if (prevProps.onClick !== nextProps.onClick) return false
  if (prevProps.onCreateJson !== nextProps.onCreateJson) return false

  // Re-render if isVisible changed from true to false (but we still render, just hidden)
  if (isVisibleChanged) return false

  return true
})

export default function Codes({ platformState }: CodesProps) {
  const { user, isProfileLoaded } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isAuthed = !!user
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Default platform state for when component is rendered without props
  const defaultPlatformState: PlatformState = {
    activeTab: 'codes',
    setActiveTab: () => {},
    searchTerm: '',
    setSearchTerm: () => {},
    selectedTech: 'all',
    setSelectedTech: () => {},
    filteredSnippets: (snippets: CardFeatureType[]) => snippets
  }

  const activePlatformState = platformState || defaultPlatformState

  // URL state: ?page= (somente para tab=codes)
  const initialPage = useMemo(() => {
    const p = Number(searchParams?.get('page') || 1)
    return Number.isFinite(p) && p > 0 ? Math.floor(p) : 1
  }, [searchParams])
  // ================================================
  // ESTADO E HOOKS - Gerenciamento de estado da página
  // ================================================
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [deletingSnippet, setDeletingSnippet] = useState<CardFeatureType | null>(null)
  const [selectedCardType, _setSelectedCardType] = useState<string>('codigos')
  const [selectedDirectoryTab, setSelectedDirectoryTab] = useState<string>('approved')
  const [selectedMacroCategory, setSelectedMacroCategory] = useState<string>('all')
  const [isCreatingJSON, setIsCreatingJSON] = useState(false)
  const [isCreatingJSONLoading, setIsCreatingJSONLoading] = useState(false)
  
  // Estados para seleção múltipla e bulk delete
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  const selectedVisibility =
    selectedDirectoryTab === 'approved' || selectedDirectoryTab === 'validating'
      ? Visibility.PUBLIC
      : (selectedDirectoryTab as Visibility)

  const selectedApprovalStatus =
    selectedDirectoryTab === 'approved'
      ? ApprovalStatus.APPROVED
      : selectedDirectoryTab === 'validating'
        ? ApprovalStatus.PENDING
        : 'all'
  
  // Hook principal para operações CRUD e dados da API com filtros do platformState
  const cardFeatures = useCardFeatures({ initialPage }, {
    searchTerm: activePlatformState.searchTerm,
    selectedTech: activePlatformState.selectedTech,
    selectedVisibility,
    selectedApprovalStatus,
    selectedCardType,
    setSearchTerm: activePlatformState.setSearchTerm,
    setSelectedTech: activePlatformState.setSelectedTech
  })

  // Manter URL sincronizada com a paginação atual
  useEffect(() => {
    // Se o usuário está navegando para outra tab, NÃO forçar tab=codes de volta.
    const currentTab = searchParams?.get('tab') || 'home'
    if (currentTab !== 'codes') return

    const params = new URLSearchParams(searchParams?.toString() || '')
    // Só persistimos page na aba codes (não tocar no param tab aqui)
    if (cardFeatures.currentPage <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(cardFeatures.currentPage))
    }
    const qs = params.toString()
    
    const url = pathname ? (qs ? `${pathname}?${qs}` : pathname) : null
    const currentUrl = pathname ? (searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname) : null
    
    if (url && url !== currentUrl) {
      router.replace(url, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardFeatures.currentPage, pathname, router, searchParams])

  // Manter foco no input de busca após carregar resultados
  useEffect(() => {
    if (cardFeatures.searchTerm && !cardFeatures.loading && searchInputRef.current) {
      // Só restaura foco se o input não está focado e tem termo de busca
      if (document.activeElement !== searchInputRef.current) {
        searchInputRef.current.focus()
        // Coloca cursor no final do texto
        const len = cardFeatures.searchTerm.length
        searchInputRef.current.setSelectionRange(len, len)
      }
    }
  }, [cardFeatures.loading, cardFeatures.searchTerm])

  // A API já retorna os dados filtrados e a contagem correta para paginação
  const rawSnippets = cardFeatures.filteredItems
  const codeSnippets = useMemo(() => {
    if (selectedMacroCategory === 'all') return rawSnippets
    return rawSnippets.filter((s) => {
      const macroCat = (s as { macro_category?: string }).macro_category
        || getMacroCategory(s.tags || [], s.category)
      return macroCat === selectedMacroCategory
    })
  }, [rawSnippets, selectedMacroCategory])

  const macroCategoryStats = useMemo(() => getMacroCategoryStats(rawSnippets), [rawSnippets])

  // ================================================
  // EVENT HANDLERS - Funções para lidar com ações do usuário
  // ================================================
  
  // Handler para criação de novo CardFeature
  const handleCreateSubmit = async (formData: unknown) => {
    try {
      const result = await cardFeatures.createCardFeature(formData as CreateCardFeatureData)
      if (result) {
        console.log('CardFeature criado com sucesso:', result)
        // Modal já fechará automaticamente via hook
        // Retorna o card criado para permitir compartilhamento no CardFeatureForm
        return result
      }
      return null
    } catch (error) {
      console.error('Erro no handleCreateSubmit:', error)
      return null
    }
  }

  // Handler para edição de CardFeature existente
  const handleEditSubmit = async (formData: unknown) => {
    try {
      if (cardFeatures.editingItem) {
        console.log('Editando CardFeature:', cardFeatures.editingItem.id, formData)
        const result = await cardFeatures.updateCardFeature(cardFeatures.editingItem.id, formData as Partial<CreateCardFeatureData>)
        if (result) {
          console.log('CardFeature editado com sucesso:', result)
          // Modal já fechará automaticamente via hook
          return result
        }
      }
      return null
    } catch (error) {
      console.error('Erro no handleEditSubmit:', error)
      return null
    }
  }

  // Handler para iniciar processo de exclusão
  const handleDeleteClick = (snippetId: string) => {
    const snippet = codeSnippets.find(s => s.id === snippetId)
    if (snippet) {
      setDeletingSnippet(snippet)
    }
  }

  const canEditSnippet = (snippet: CardFeatureType) => {
    if (isAdmin) return true
    if (!user?.id) return false
    return snippet.createdBy === user.id
  }

  const handleApprove = async (snippetId: string) => {
    if (!isAdmin) return
    await cardFeatureService.approve(snippetId)
    await cardFeatures.refreshData()
  }

  const handleReject = async (snippetId: string) => {
    if (!isAdmin) return
    await cardFeatureService.reject(snippetId)
    await cardFeatures.refreshData()
  }

  // Handler para confirmar exclusão
  const handleDeleteConfirm = async () => {
    if (deletingSnippet) {
      await cardFeatures.deleteCardFeature(deletingSnippet.id)
      setDeletingSnippet(null)
    }
  }

  // Handler para cancelar exclusão
  const handleDeleteCancel = () => {
    setDeletingSnippet(null)
  }

  // Handler para criação via JSON
  const handleCreateJSONSubmit = async (formData: CreateCardFeatureData) => {
    try {
      setIsCreatingJSONLoading(true)
      const result = await cardFeatures.createCardFeature(formData)
      if (result) {
        console.log('CardFeature criado via JSON com sucesso:', result)
        setIsCreatingJSON(false)
      }
    } catch (error) {
      console.error('Erro no handleCreateJSONSubmit:', error)
      throw error
    } finally {
      setIsCreatingJSONLoading(false)
    }
  }

  // Memoized callback for create button - prevents re-renders
  const handleStartCreating = useCallback(() => {
    cardFeatures.startCreating()
  }, [cardFeatures.startCreating])

  // Handler para ativar/desativar modo seleção
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedCardIds([])
  }

  // Handler para selecionar/desselecionar card
  const handleToggleCardSelection = (cardId: string) => {
    setSelectedCardIds(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    )
  }

  // Handler para deletar cards selecionados
  const handleBulkDelete = async () => {
    if (selectedCardIds.length === 0) return

    try {
      setIsDeletingBulk(true)
      const response = await cardFeatureService.bulkDelete(selectedCardIds)
      
      if (response?.success) {
        const deletedCount = response.data?.deletedCount || 0
        toast.success(`${deletedCount} card(s) deletado(s) com sucesso`)
        setSelectedCardIds([])
        setIsSelectionMode(false)
        cardFeatures.refreshData()
      } else {
        toast.error(response?.error || 'Erro ao deletar cards')
      }
    } catch (error) {
      console.error('Erro no bulk delete:', error)
      toast.error('Erro ao deletar cards')
    } finally {
      setIsDeletingBulk(false)
    }
  }

  // ================================================
  // RENDER - Interface do usuário da página
  // ================================================

  // HEADER - Breadcrumb + Busca + Filtros + Botão Criar
  return (
    <div className="space-y-6 w-full overflow-x-hidden px-1">
      {/* Header - Layout Responsivo */}
      <div className="space-y-4 w-full max-w-[900px] mx-auto">
        {/* Breadcrumb Navigation */}
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
            onClick={() => {
              cardFeatures.setSelectedTech("all")
              cardFeatures.setSearchTerm("")
            }}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
          >
            Blocos de Códigos
          </button>
          {cardFeatures.selectedTech !== "all" && (
            <>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 font-medium capitalize">{cardFeatures.selectedTech}</span>
            </>
          )}
        </div>

        {/* Search Input and Create Button Row - Unificados na mesma linha com filtro interno */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar snippets..."
              value={cardFeatures.searchTerm}
              onChange={(e) => cardFeatures.setSearchTerm(e.target.value)}
              className="pl-10 pr-10 w-full h-10"
            />
          </div>

          {/* Pencil Button (selection mode) - Only in unlisted/private tabs */}
          {(selectedDirectoryTab === 'unlisted' || selectedDirectoryTab === 'private') && isProfileLoaded && isAuthed && (
            <Button
              onClick={handleToggleSelectionMode}
              disabled={cardFeatures.loading}
              size="sm"
              variant={isSelectionMode ? "secondary" : "ghost"}
              className={`flex-shrink-0 ${isSelectionMode ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
              title={isSelectionMode ? "Sair do modo seleção" : "Selecionar cards"}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          {/* Create Button with Dropdown (admin only) */}
          <CreateCardButton
            onClick={handleStartCreating}
            onCreateJson={() => setIsCreatingJSON(true)}
            disabled={false}
            loading={cardFeatures.loading}
            creating={cardFeatures.creating}
            isSelectionMode={isSelectionMode}
            isVisible={isProfileLoaded && isAuthed}
          />
        </div>

        {/* Visibility Tabs Row - Split into Global and Personal Groups */}
        <Tabs value={selectedDirectoryTab} onValueChange={setSelectedDirectoryTab} className="w-full max-w-[900px] mx-auto mt-2 mb-6">
          <div className="flex gap-3 sm:gap-6 items-end w-full">
            {/* Group 1: Global Directory */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 truncate">
                <Globe className="h-3 w-3 mr-1 text-green-600/50" />
                Global
              </div>
              <TabsList className="h-10 w-full grid grid-cols-2 bg-gray-100 p-1 rounded-lg border border-gray-200/50">
                <TabsTrigger 
                  value="approved" 
                  className="w-full text-xs sm:text-sm h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-green-700 transition-all" 
                  disabled={cardFeatures.loading}
                >
                  <div className="flex items-center justify-center">
                    <BadgeCheck className="h-4 w-4 sm:mr-2 text-green-600" />
                    <span className="hidden sm:inline">Aprovados</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="validating" 
                  className="w-full text-xs sm:text-sm h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700 transition-all" 
                  disabled={cardFeatures.loading}
                >
                  <div className="flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 sm:mr-2 text-amber-600" />
                    <span className="hidden sm:inline">Validando</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Group 2: Personal Space */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 truncate">
                <User className="h-3 w-3 mr-1 text-orange-600/50" />
                Seu Espaço
              </div>
              <TabsList className="h-10 w-full grid grid-cols-2 bg-gray-100 p-1 rounded-lg border border-gray-200/50">
                <TabsTrigger 
                  value="unlisted" 
                  className="text-xs sm:text-sm h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700 transition-all" 
                  disabled={cardFeatures.loading}
                >
                  <div className="flex items-center justify-center">
                    <Link2 className="h-4 w-4 sm:mr-2 text-blue-600" />
                    <span className="hidden sm:inline">Não Listados</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="private" 
                  className="text-xs sm:text-sm h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-700 transition-all" 
                  disabled={cardFeatures.loading}
                >
                  <div className="flex items-center justify-center">
                    <Lock className="h-4 w-4 sm:mr-2 text-orange-600" />
                    <span className="hidden sm:inline">Privados</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </Tabs>

        {/* Macro category filter - dropdown */}
        {!cardFeatures.loading && rawSnippets.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500 font-medium">Categoria:</span>
            <Select value={selectedMacroCategory} onValueChange={setSelectedMacroCategory}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ({rawSnippets.length})</SelectItem>
                {macroCategoryStats
                  .sort((a, b) => a.priority - b.priority)
                  .map(({ category, count }) => (
                    <SelectItem key={category} value={category}>
                      {category} ({count})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ===== ESTADOS DA UI - Loading, Error, Empty ===== */}
      {/* Loading State - Barra horizontal azul */}
      {cardFeatures.loading && (
        <div className="w-full max-w-[900px] mx-auto bg-gray-200 rounded-full h-2 mb-6">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
        </div>
      )}

      {/* Error State */}
      {cardFeatures.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-600">
              <X className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar snippets</h3>
              <p className="text-sm text-red-700 mt-1">{cardFeatures.error}</p>
              <button
                onClick={() => cardFeatures.refreshData()}
                className="text-sm text-red-600 hover:text-red-800 underline mt-2"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State - mostra quando não há cards (com ou sem filtros) */}
      {!cardFeatures.loading && !cardFeatures.error && codeSnippets.length === 0 && (
        <div className="text-center py-12">
          <Code2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {cardFeatures.searchTerm || cardFeatures.selectedTech !== 'all' || selectedDirectoryTab !== 'approved' || selectedMacroCategory !== 'all'
              ? 'Nenhum snippet encontrado'
              : 'Nenhum card disponível'
            }
          </h3>
          <p className="text-gray-600">
            {cardFeatures.searchTerm || cardFeatures.selectedTech !== 'all' || selectedDirectoryTab !== 'approved' || selectedMacroCategory !== 'all'
              ? 'Tente ajustar seus filtros de busca'
              : 'Ainda não há snippets de código disponíveis para visualização'
            }
          </p>
        </div>
      )}

      {/* ===== CONTEÚDO PRINCIPAL - Visualização em Lista ===== */}
      {!cardFeatures.loading && !cardFeatures.error && codeSnippets.length > 0 && (
        <>
          {/* View Lista - Layout Vertical */}
          <div className="space-y-4 w-full max-w-[900px] mx-auto">
            {codeSnippets.map((snippet) => {
              const canEdit = canEditSnippet(snippet)
              return (
                <div key={snippet.id} className="space-y-2">
                  <CardFeatureCompact
                    snippet={snippet}
                    onEdit={(s) => {
                      if (!canEdit) return
                      cardFeatures.startEditing(s)
                    }}
                    onDelete={(snippetId) => {
                      if (!canEdit) return
                      handleDeleteClick(snippetId)
                    }}
                    onUpdate={async (id, data) => {
                      await cardFeatures.updateCardFeature(id, data)
                    }}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedCardIds.includes(snippet.id)}
                    onToggleSelect={handleToggleCardSelection}
                    expandOnClick
                  />

                  {selectedDirectoryTab === 'validating' && isAdmin && snippet.approvalStatus === ApprovalStatus.PENDING && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleReject(snippet.id)}>
                        Rejeitar
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(snippet.id)}>
                        Aprovar
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Botão flutuante de deletar cards selecionados */}
          {isSelectionMode && selectedCardIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-white rounded-full shadow-2xl border-2 border-red-500 px-6 py-3 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  {selectedCardIds.length} card(s) selecionado(s)
                </span>
                <Button
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white min-h-[44px] sm:min-h-0"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeletingBulk ? 'Deletando...' : 'Deletar'}
                </Button>
              </div>
            </div>
          )}

          {/* Controles de Paginação */}
          {cardFeatures.totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (cardFeatures.hasPrevPage) {
                          cardFeatures.prevPage()
                        }
                      }}
                      disabled={!cardFeatures.hasPrevPage}
                      className="gap-1 pl-2.5"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                      <span>Anterior</span>
                    </Button>
                  </PaginationItem>
                  
                  {/* Números das páginas */}
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
                          variant={cardFeatures.currentPage === pageNum ? "outline" : "ghost"}
                          size="sm"
                          onClick={() => cardFeatures.goToPage(pageNum)}
                          className="min-w-[2.5rem]"
                        >
                          {pageNum}
                        </Button>
                      </PaginationItem>
                    )
                  })}
                  
                  {cardFeatures.totalPages > 5 && cardFeatures.currentPage < cardFeatures.totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (cardFeatures.hasNextPage) {
                          cardFeatures.nextPage()
                        }
                      }}
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

          {/* Informação de paginação */}
          {cardFeatures.totalCount > 0 && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Mostrando {((cardFeatures.currentPage - 1) * 10) + 1} - {Math.min(cardFeatures.currentPage * 10, cardFeatures.totalCount)} de {cardFeatures.totalCount} cards
            </div>
          )}
        </>
      )}

      {/* ===== MODAIS - Formulários e Confirmações ===== */}
      {/* Create CardFeature Modal */}
      {(isProfileLoaded && isAuthed) && (
        <CardFeatureForm
          isOpen={cardFeatures.isCreating}
          mode="create"
          isLoading={cardFeatures.creating}
          onClose={cardFeatures.cancelCreating}
          onSubmit={handleCreateSubmit}
          isAdmin={isAdmin}
        />
      )}

      {/* Create CardFeature via JSON Modal */}
      {(isProfileLoaded && isAuthed) && (
        <CardFeatureFormJSON
          isOpen={isCreatingJSON}
          isLoading={isCreatingJSONLoading}
          onClose={() => setIsCreatingJSON(false)}
          onSubmit={handleCreateJSONSubmit}
        />
      )}

      {/* Edit CardFeature Modal */}
      {(isProfileLoaded && isAuthed) && (
        <CardFeatureForm
          isOpen={cardFeatures.isEditing}
          mode="edit"
          initialData={cardFeatures.editingItem || undefined}
          isLoading={cardFeatures.updating}
          onClose={cardFeatures.cancelEditing}
          onSubmit={handleEditSubmit}
          isAdmin={isAdmin}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {(isProfileLoaded && isAuthed) && (
        <DeleteConfirmationDialog
          isOpen={!!deletingSnippet}
          snippet={deletingSnippet}
          isDeleting={cardFeatures.deleting}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      )}

    </div>
  )
}

// Disable static generation for this page
export async function getServerSideProps() {
  return {
    props: {}
  }
}

