import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, ChevronRight, Code2, X, Loader2, Plus } from "lucide-react"
import { useCardFeatures } from "@/hooks/useCardFeatures"
import CardFeature from "@/components/CardFeature"
import CardFeatureModal from "@/components/CardFeatureModal"
import CardFeatureForm from "@/components/CardFeatureForm"
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog"
import type { CardFeature as CardFeatureType } from "@/types"

interface PlatformState {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedTech: string
  setSelectedTech: (tech: string) => void
  filteredSnippets: (snippets: CardFeatureType[]) => CardFeatureType[]
}

interface CodesProps {
  platformState: PlatformState
}


export default function Codes({ platformState }: CodesProps) {
  const [openModalId, setOpenModalId] = useState<string | null>(null)
  const [deletingSnippet, setDeletingSnippet] = useState<CardFeatureType | null>(null)
  
  // Usar o hook de CardFeatures com API
  const cardFeatures = useCardFeatures()

  // Usar dados da API
  const codeSnippets = cardFeatures.filteredItems

  // Handlers para os componentes
  const handleCreateSubmit = async (formData: any) => {
    await cardFeatures.createCardFeature(formData)
  }

  const handleEditSubmit = async (formData: any) => {
    if (cardFeatures.editingItem) {
      await cardFeatures.updateCardFeature(cardFeatures.editingItem.id, formData)
    }
  }

  // Handlers para exclusão
  const handleDeleteClick = (snippetId: string) => {
    const snippet = codeSnippets.find(s => s.id === snippetId)
    if (snippet) {
      setDeletingSnippet(snippet)
    }
  }

  const handleDeleteConfirm = async () => {
    if (deletingSnippet) {
      await cardFeatures.deleteCardFeature(deletingSnippet.id)
      setDeletingSnippet(null)
      setOpenModalId(null) // Fecha o modal se estiver aberto
    }
  }

  const handleDeleteCancel = () => {
    setDeletingSnippet(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2 text-sm mb-2">
            <button
              onClick={() => platformState.setActiveTab("home")}
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
              Biblioteca de Códigos
            </button>
            {cardFeatures.selectedTech !== "all" && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 font-medium capitalize">{cardFeatures.selectedTech}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar snippets..."
              value={cardFeatures.searchTerm}
              onChange={(e) => cardFeatures.setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              disabled={cardFeatures.loading}
            />
          </div>
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
          <Button
            onClick={cardFeatures.startCreating}
            disabled={cardFeatures.loading || cardFeatures.creating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {cardFeatures.creating ? 'Criando...' : 'Novo CardFeature'}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {cardFeatures.loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Carregando snippets...</span>
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

      {/* Empty State */}
      {!cardFeatures.loading && !cardFeatures.error && codeSnippets.length === 0 && (
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

      {/* Content Grid */}
      {!cardFeatures.loading && !cardFeatures.error && codeSnippets.length > 0 && (
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

      {/* Code Expansion Modal */}
      <CardFeatureModal
        snippet={codeSnippets.find(s => s.id === openModalId) || null}
        isOpen={!!openModalId}
        onClose={() => setOpenModalId(null)}
        onEdit={(snippet) => cardFeatures.startEditing(snippet)}
        onDelete={handleDeleteClick}
      />

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
    </div>
  )
}