import { Button } from "@/components/ui/button"
import { X, Edit, Trash2 } from "lucide-react"
import SyntaxHighlighter from "./SyntaxHighlighter"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[92vw] h-[90vh] flex flex-col">
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
        <div className="flex-1 overflow-hidden p-4">
          <div className="flex flex-wrap justify-start gap-8 h-full">
            {snippet.screens.map((screen, index) => (
              <div key={index} className="flex flex-col h-full w-[500px]">
                <div className="mb-3 flex-shrink-0">
                  <h4 className="font-medium text-gray-900">{screen.name}</h4>
                  <p className="text-sm text-gray-600">{screen.description}</p>
                </div>
                <div className="rounded-xl shadow-xl p-6 relative group mb-4" 
                     style={{backgroundColor: '#f8f8ff', 
                              fontFamily: 'Fira Code, Consolas, Monaco, monospace',
                              height: '475px'}}>
                  <style>{`
                    .codeblock-scroll::-webkit-scrollbar {
                      width: 8px;
                    }
                    .codeblock-scroll::-webkit-scrollbar-track {
                      background: rgba(0, 0, 0, 0.1);
                      border-radius: 4px;
                    }
                    .codeblock-scroll::-webkit-scrollbar-thumb {
                      background: rgba(0, 0, 0, 0.3);
                      border-radius: 4px;
                    }
                    .codeblock-scroll::-webkit-scrollbar-thumb:hover {
                      background: rgba(0, 0, 0, 0.5);
                    }
                  `}</style>
                  <div className="codeblock-scroll relative z-10 h-full overflow-y-auto -mx-6 px-6">
                    <SyntaxHighlighter
                      code={screen.code}
                      language={snippet.language}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}