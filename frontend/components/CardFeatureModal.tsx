import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import ContentRenderer from "./ContentRenderer"
import type { CardFeature } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface CardFeatureModalProps {
  snippet: CardFeature | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (snippet: CardFeature) => void
  onDelete?: (snippetId: string) => void
}

export default function CardFeatureModal({ snippet, isOpen, onClose, onEdit, onDelete }: CardFeatureModalProps) {
  if (!snippet) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-xl">{snippet.title}</DialogTitle>
              {snippet.description && (
                <DialogDescription className="mt-1">{snippet.description}</DialogDescription>
              )}
            </div>
            {(onEdit || onDelete) && (
              <div className="flex gap-2 flex-shrink-0">
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
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="flex gap-6 px-6 pb-6 h-full">
            {snippet.screens.map((screen, index) => (
              <div key={index} className="flex-shrink-0 w-[300px] sm:w-[500px] flex flex-col">
                <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
                  <ContentRenderer blocks={screen.blocks || []} />
                </div>
              </div>
            ))}
            {snippet.screens.length === 0 && (
              <div className="flex items-center justify-center w-full py-12 text-gray-500">
                Nenhum conteúdo disponível
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
