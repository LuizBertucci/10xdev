import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, ChevronRight, Code2, X, Loader2, Plus, LayoutGrid, List } from "lucide-react"
import { useCardFeatures } from "@/hooks/useCardFeatures"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import CardFeature from "@/components/CardFeature"
import CardFeatureModal from "@/components/CardFeatureModal"
import CardFeatureForm from "@/components/CardFeatureForm"
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog"
import type { CardFeature as CardFeatureType } from "@/types"

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
  // ================================================
  // ESTADO E HOOKS - Gerenciamento de estado da página
  // ================================================
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list')
  const [openModalId, setOpenModalId] = useState<string | null>(null)
  const [deletingSnippet, setDeletingSnippet] = useState<CardFeatureType | null>(null)
  const [selectedCardType, setSelectedCardType] = useState<string>('all')
  
  // Hook principal para operações CRUD e dados da API com filtros do platformState
  const cardFeatures = useCardFeatures({}, {
    searchTerm: activePlatformState.searchTerm,
    selectedTech: activePlatformState.selectedTech,
    setSearchTerm: activePlatformState.setSearchTerm,
    setSelectedTech: activePlatformState.setSelectedTech
  })

  // Dados filtrados vindos da API
  const codeSnippets = cardFeatures.filteredItems.filter(item =>
    selectedCardType === 'all' || item.card_type === selectedCardType
  )

  // ================================================
  // EVENT HANDLERS - Funções para lidar com ações do usuário
  // ================================================
  
  // Handler para criação de novo CardFeature
  const handleCreateSubmit = async (formData: any) => {
    try {
      const result = await cardFeatures.createCardFeature(formData)
      if (result) {
        console.log('CardFeature criado com sucesso:', result)
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

  // ================================================
  // RENDER - Interface do usuário da página
  // ================================================

  // HEADER - Breadcrumb + Busca + Filtros + Botão Criar
  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header - Layout Responsivo */}
      <div className="space-y-4 w-full max-w-[900px] mx-auto px-4">
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

        {/* Filters and Actions Row - Alinhados à direita */}
        <div className="flex justify-end gap-2 sm:gap-3 items-center flex-wrap md:mb-3">
          {/* Card Type Filter */}
          <Select
            value={selectedCardType}
            onValueChange={setSelectedCardType}
            disabled={cardFeatures.loading}
          >
            <SelectTrigger className="w-32 sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="dicas">Dicas</SelectItem>
              <SelectItem value="codigos">Códigos</SelectItem>
              <SelectItem value="workflows">Workflows</SelectItem>
            </SelectContent>
          </Select>

          {/* Tech Filter */}
          <Select
            value={cardFeatures.selectedTech}
            onValueChange={cardFeatures.setSelectedTech}
            disabled={cardFeatures.loading}
          >
            <SelectTrigger className="w-32 sm:w-40">
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

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden flex-shrink-0">
            <Button
              onClick={() => setViewMode('cards')}
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none border-0 ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none border-0 border-l border-gray-300 ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Visualização em Lista"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Create Button */}
          <Button
            onClick={cardFeatures.startCreating}
            disabled={cardFeatures.loading || cardFeatures.creating}
            className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap flex-shrink-0"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {cardFeatures.creating ? 'Criando...' : 'Novo CardFeature'}
            </span>
          </Button>
        </div>

        {/* Search Input - Linha separada abaixo */}
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

      {/* Empty State - só mostra se não está carregando E tem filtros aplicados */}
      {!cardFeatures.loading && !cardFeatures.error && codeSnippets.length === 0 && (cardFeatures.searchTerm || cardFeatures.selectedTech !== 'all') && (
        <div className="text-center py-12">
          <Code2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum snippet encontrado</h3>
          <p className="text-gray-600">
            {cardFeatures.searchTerm || cardFeatures.selectedTech !== 'all'
              ? 'Tente ajustar seus filtros de busca'
              : 'Ainda não há snippets de código disponíveis'
            }
          </p>
        </div>
      )}

      {/* ===== CONTEÚDO PRINCIPAL - Renderização Condicional por View Mode ===== */}
      {!cardFeatures.loading && !cardFeatures.error && codeSnippets.length > 0 && (
        <>
          {/* View Lista (Padrão) - Layout Vertical */}
          {viewMode === 'list' && (
            <div className="space-y-4 w-full max-w-full overflow-hidden max-w-[900px] mx-auto">
              {codeSnippets.map((snippet) => (
                <CardFeatureCompact
                  key={snippet.id}
                  snippet={snippet}
                  onEdit={(snippet) => cardFeatures.startEditing(snippet)}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}

          {/* View Cards - Layout Grid 2 Colunas */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {codeSnippets.map((snippet) => (
                <CardFeature
                  key={snippet.id}
                  snippet={snippet}
                  onEdit={(snippet) => cardFeatures.startEditing(snippet)}
                  onExpand={(snippetId) => setOpenModalId(snippetId)}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== MODAIS - Formulários e Confirmações ===== */}
      {/* Create CardFeature Modal */}
      <CardFeatureForm
        isOpen={cardFeatures.isCreating}
        mode="create"
        isLoading={cardFeatures.creating}
        onClose={cardFeatures.cancelCreating}
        onSubmit={handleCreateSubmit}
      />

      {/* Edit CardFeature Modal */}
      <CardFeatureForm
        isOpen={cardFeatures.isEditing}
        mode="edit"
        initialData={cardFeatures.editingItem || undefined}
        isLoading={cardFeatures.updating}
        onClose={cardFeatures.cancelEditing}
        onSubmit={handleEditSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deletingSnippet}
        snippet={deletingSnippet}
        isDeleting={cardFeatures.deleting}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />

      {/* Card Feature Modal (only for cards view) */}
      {viewMode === 'cards' && openModalId && (
        <CardFeatureModal
          isOpen={!!openModalId}
          snippet={codeSnippets.find(s => s.id === openModalId) || null}
          onClose={() => setOpenModalId(null)}
          onEdit={(snippet) => {
            setOpenModalId(null)
            cardFeatures.startEditing(snippet)
          }}
          onDelete={(snippetId) => {
            handleDeleteClick(snippetId)
            setOpenModalId(null)
          }}
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

