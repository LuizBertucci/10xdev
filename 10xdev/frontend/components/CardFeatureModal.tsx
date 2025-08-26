import { Button } from "@/components/ui/button"
import { X, Edit, Trash2 } from "lucide-react"
import type { CardFeature } from "@/types"

interface CardFeatureModalProps {
  snippet: CardFeature | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (snippet: CardFeature) => void
  onDelete?: (snippetId: string) => void
}

export default function CardFeatureModal({ snippet, isOpen, onClose, onEdit, onDelete }: CardFeatureModalProps) {
  if (!isOpen || !snippet) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-xl font-semibold">{snippet.title}</h3>
            <p className="text-gray-600 text-sm">{snippet.description}</p>
          </div>
          <div className="flex space-x-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(snippet)}
                className="text-gray-600 hover:text-gray-900"
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(snippet.id)}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {snippet.screens.map((screen, index) => (
              <div key={index} className="flex flex-col">
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900">{screen.name}</h4>
                  <p className="text-sm text-gray-600">{screen.description}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto flex-1">
                  <pre className="text-sm text-gray-100 leading-relaxed">
                    <code>{screen.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}