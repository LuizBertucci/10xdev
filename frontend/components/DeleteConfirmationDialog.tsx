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
import { Loader2, AlertTriangle } from "lucide-react"
import type { CardFeature } from "@/types"

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  snippet: CardFeature | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteConfirmationDialog({
  isOpen,
  snippet,
  isDeleting,
  onClose,
  onConfirm
}: DeleteConfirmationDialogProps) {
  if (!snippet) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o CardFeature{" "}
            <span className="font-semibold text-gray-900">"{snippet.title}"</span>?
          </AlertDialogDescription>
          <p className="text-sm text-red-600">
            ⚠️ Esta ação não pode ser desfeita. Todos os {snippet.screens.length} arquivo{snippet.screens.length > 1 ? 's' : ''}
            {" "}ser{snippet.screens.length > 1 ? 'ão' : 'á'} permanentemente removido{snippet.screens.length > 1 ? 's' : ''}.
          </p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Definitivamente'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}