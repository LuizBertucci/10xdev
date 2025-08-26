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
  favorites: Set<string>
  toggleFavorite: (id: string) => void
  setActiveTab: (tab: string) => void
}

interface CodesProps {
  platformState: PlatformState
}


export default function Codes({ platformState }: CodesProps) {
  const [openModalId, setOpenModalId] = useState<string | null>(null)
  const [deletingSnippet, setDeletingSnippet] = useState<CardFeatureType | null>(null)
  
  // Use CardFeatures hook with API
  const cardFeatures = useCardFeatures()

  // Use API data
  const codeSnippets = cardFeatures.filteredItems

  // Handlers for components
  const handleCreateSubmit = async (formData: any) => {
    try {
      await cardFeatures.createCardFeature(formData)
    } catch (error) {
    }
  }

  const handleEditSubmit = async (formData: any) => {
    if (cardFeatures.editingItem) {
      await cardFeatures.updateCardFeature(cardFeatures.editingItem.id, formData)
    }
  }

  // Handlers for deletion
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
      setOpenModalId(null) // Close modal if open
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
              Home
            </button>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => {
                cardFeatures.setSelectedTech("all")
                cardFeatures.setSearchTerm("")
              }}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Code Library
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
              placeholder="Search snippets..."
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
              <SelectItem value="all">All</SelectItem>
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
            {cardFeatures.creating ? 'Creating...' : 'New CardFeature'}
          </Button>
        </div>
      </div>

      {cardFeatures.loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading snippets...</span>
        </div>
      )}

      {cardFeatures.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-600">
              <X className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading snippets</h3>
              <p className="text-sm text-red-700 mt-1">{cardFeatures.error}</p>
              <button
                onClick={() => cardFeatures.refreshData()}
                className="text-sm text-red-600 hover:text-red-800 underline mt-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {!cardFeatures.loading && !cardFeatures.error && codeSnippets.length === 0 && (
        <div className="text-center py-12">
          <Code2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No snippets found</h3>
          <p className="text-gray-600">
            {cardFeatures.searchTerm || cardFeatures.selectedTech !== 'all'
              ? 'Try adjusting your search filters'
              : 'No code snippets available yet'
            }
          </p>
        </div>
      )}

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

      <CardFeatureModal
        snippet={codeSnippets.find(s => s.id === openModalId) || null}
        isOpen={!!openModalId}
        onClose={() => setOpenModalId(null)}
        onEdit={(snippet) => cardFeatures.startEditing(snippet)}
        onDelete={handleDeleteClick}
      />

      <CardFeatureForm
        isOpen={cardFeatures.isCreating}
        mode="create"
        isLoading={cardFeatures.creating}
        onClose={cardFeatures.cancelCreating}
        onSubmit={handleCreateSubmit}
      />

      <CardFeatureForm
        isOpen={cardFeatures.isEditing}
        mode="edit"
        initialData={cardFeatures.editingItem || undefined}
        isLoading={cardFeatures.updating}
        onClose={cardFeatures.cancelEditing}
        onSubmit={handleEditSubmit}
      />

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