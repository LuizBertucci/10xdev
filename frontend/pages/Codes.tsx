import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Filter, ChevronRight, ChevronDown, Code2, X, Loader2, Plus, FileJson, Globe, Lock, Eye } from "lucide-react"
import { useCardFeatures } from "@/hooks/useCardFeatures"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import CardFeatureForm from "@/components/CardFeatureForm"
import CardFeatureFormJSON from "@/components/CardFeatureFormJSON"
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination"
import type { CardFeature as CardFeatureType, CreateCardFeatureData } from "@/types"
import { useAuth } from "@/hooks/useAuth"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

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

export default function Codes({ platformState }: CodesProps) {
  const { user, isProfileLoaded } = useAuth()
  const isAdmin = user?.role === 'admin'
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
  const [deletingSnippet, setDeletingSnippet] = useState<CardFeatureType | null>(null)
  const [selectedCardType, setSelectedCardType] = useState<string>('all')
  const [selectedVisibility, setSelectedVisibility] = useState<string>('all')
  const [isCreatingJSON, setIsCreatingJSON] = useState(false)
  const [isCreatingJSONLoading, setIsCreatingJSONLoading] = useState(false)
  
  // Hook principal para operações CRUD e dados da API com filtros do platformState
  const cardFeatures = useCardFeatures({ initialPage }, {
    searchTerm: activePlatformState.searchTerm,
    selectedTech: activePlatformState.selectedTech,
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
    const url = qs ? `${pathname}?${qs}` : pathname
    const currentUrl = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname
    if (url !== currentUrl) {
      router.replace(url, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardFeatures.currentPage, pathname, router, searchParams])

  // Dados filtrados vindos da API
  const codeSnippets = cardFeatures.filteredItems.filter(item => {
    // Filtro por tipo de card
    const matchesCardType = selectedCardType === 'all' || item.card_type === selectedCardType

    // Filtro por visibilidade
    let matchesVisibility = true
    if (selectedVisibility === 'public') {
      matchesVisibility = !item.isPrivate
    } else if (selectedVisibility === 'private') {
      matchesVisibility = item.isPrivate === true
    }
    // 'all' não filtra por visibilidade

    return matchesCardType && matchesVisibility
  })

  // ================================================
  // EVENT HANDLERS - Funções para lidar com ações do usuário
  // ================================================
  
  // Handler para criação de novo CardFeature
  const handleCreateSubmit = async (formData: any) => {
    try {
      const result = await cardFeatures.createCardFeature(formData)
      if (result) {
        console.log('CardFeature criado com sucesso:', result)

        // Se for card privado, processar emails de compartilhamento
        const shareEmailsInput = document.querySelector('[data-share-emails]') as HTMLInputElement
        const shareEmails = shareEmailsInput?.value?.trim()

        if (formData.is_private && shareEmails && result.id) {
          try {
            await fetch(`/api/card-features/${result.id}/share`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ emails: shareEmails })
            })
            console.log('Card compartilhado com:', shareEmails)
          } catch (shareError) {
            console.error('Erro ao compartilhar:', shareError)
          }
        }

        // Modal já fechará automaticamente via hook
      }
    } catch (error) {
      console.error('Erro no handleCreateSubmit:', error)
    }
  }

  // Handler para edição de CardFeature existente
  const handleEditSubmit = async (formData: any) => {
    try {
      if (cardFeatures.editingItem) {
        console.log('Editando CardFeature:', cardFeatures.editingItem.id, formData)
        const result = await cardFeatures.updateCardFeature(cardFeatures.editingItem.id, formData)
        if (result) {
          console.log('CardFeature editado com sucesso:', result)
          // Modal já fechará automaticamente via hook
        }
      }
    } catch (error) {
      console.error('Erro no handleEditSubmit:', error)
    }
  }

  // Handler para iniciar processo de exclusão
  const handleDeleteClick = (snippetId: string) => {
    const snippet = codeSnippets.find(s => s.id === snippetId)
    if (snippet) {
      setDeletingSnippet(snippet)
    }
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

  // ================================================
  // RENDER - Interface do usuário da página
  // ================================================

  // HEADER - Breadcrumb + Busca + Filtros + Botão Criar
  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header - Layout Responsivo */}
      <div className="space-y-4 w-full max-w-[900px] mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => activePlatformState.setActiveTab && activePlatformState.setActiveTab("home")}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Início
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => {
              cardFeatures.setSelectedTech("all")
              cardFeatures.setSearchTerm("")
            }}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
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

        {/* Search Input - Primeira linha no mobile para fácil acesso */}
        <div className="relative w-full min-w-0 mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar snippets..."
            value={cardFeatures.searchTerm}
            onChange={(e) => cardFeatures.setSearchTerm(e.target.value)}
            className="pl-10 w-full"
            disabled={cardFeatures.loading}
          />
        </div>

        {/* Filters and Actions Row - Layout otimizado para mobile */}
        <div className="flex justify-between sm:justify-end gap-2 sm:gap-3 items-center mb-3">
          {/* Card Type Filter */}
          <Select
            value={selectedCardType}
            onValueChange={setSelectedCardType}
            disabled={cardFeatures.loading}
          >
            <SelectTrigger className="w-28 sm:w-40">
              <Filter className="h-4 w-4 mr-1 sm:mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="dicas">Dicas</SelectItem>
              <SelectItem value="codigos">Códigos</SelectItem>
              <SelectItem value="workflows">Workflows</SelectItem>
            </SelectContent>
          </Select>

          {/* Visibility Filter */}
          <Select
            value={selectedVisibility}
            onValueChange={setSelectedVisibility}
            disabled={cardFeatures.loading}
          >
            <SelectTrigger className="w-28 sm:w-40">
              <Eye className="h-4 w-4 mr-1 sm:mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-600" />
                  <span>Públicos</span>
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-orange-600" />
                  <span>Privados</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Tech Filter - Hidden on mobile */}
          <div className="hidden sm:block">
            <Select
              value={cardFeatures.selectedTech}
              onValueChange={cardFeatures.setSelectedTech}
              disabled={cardFeatures.loading}
            >
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="react">React</SelectItem>
                <SelectItem value="node.js">Node.js</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right side actions group */}
          <div className="flex items-center gap-2">
            {/* Create Button with Dropdown (admin only) */}
            {(isProfileLoaded && isAdmin) && (
              <div className="flex flex-shrink-0">
                <Button
                  onClick={cardFeatures.startCreating}
                  disabled={cardFeatures.loading || cardFeatures.creating}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap rounded-r-none px-2 sm:px-4"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="sm:hidden">
                    {cardFeatures.creating ? 'Criando...' : 'Novo card'}
                  </span>
                  <span className="hidden sm:inline">
                    {cardFeatures.creating ? 'Criando...' : 'Novo Card'}
                  </span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={cardFeatures.loading || cardFeatures.creating}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-l-none border-l border-blue-500 px-2"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsCreatingJSON(true)}>
                      <FileJson className="h-4 w-4 mr-2" />
                      Criar via JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== ESTADOS DA UI - Loading, Error, Empty ===== */}
      {/* Loading State - Barra horizontal azul */}
      {cardFeatures.loading && (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
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
            {cardFeatures.searchTerm || cardFeatures.selectedTech !== 'all' || selectedCardType !== 'all' || selectedVisibility !== 'all'
              ? 'Nenhum snippet encontrado'
              : 'Nenhum card disponível'
            }
          </h3>
          <p className="text-gray-600">
            {cardFeatures.searchTerm || cardFeatures.selectedTech !== 'all' || selectedCardType !== 'all' || selectedVisibility !== 'all'
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
            {codeSnippets.map((snippet) => (
              <CardFeatureCompact
                key={snippet.id}
                snippet={snippet}
                onEdit={(snippet) => {
                  if (!isAdmin) return
                  cardFeatures.startEditing(snippet)
                }}
                onDelete={(snippetId) => {
                  if (!isAdmin) return
                  handleDeleteClick(snippetId)
                }}
              />
            ))}
          </div>

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
      {(isProfileLoaded && isAdmin) && (
        <CardFeatureForm
          isOpen={cardFeatures.isCreating}
          mode="create"
          isLoading={cardFeatures.creating}
          onClose={cardFeatures.cancelCreating}
          onSubmit={handleCreateSubmit}
        />
      )}

      {/* Create CardFeature via JSON Modal */}
      {(isProfileLoaded && isAdmin) && (
        <CardFeatureFormJSON
          isOpen={isCreatingJSON}
          isLoading={isCreatingJSONLoading}
          onClose={() => setIsCreatingJSON(false)}
          onSubmit={handleCreateJSONSubmit}
        />
      )}

      {/* Edit CardFeature Modal */}
      {(isProfileLoaded && isAdmin) && (
        <CardFeatureForm
          isOpen={cardFeatures.isEditing}
          mode="edit"
          initialData={cardFeatures.editingItem || undefined}
          isLoading={cardFeatures.updating}
          onClose={cardFeatures.cancelEditing}
          onSubmit={handleEditSubmit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {(isProfileLoaded && isAdmin) && (
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

