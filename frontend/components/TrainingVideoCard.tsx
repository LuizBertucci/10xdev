import { useState } from "react"
import { TrainingVideo } from "@/types/training"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Pencil, Trash2, Play, Calendar, Tag, Bookmark } from "lucide-react"
import { useSavedItems } from "@/hooks/useSavedItems"

interface TrainingVideoCardProps {
  video: TrainingVideo
  onEdit: (video: TrainingVideo) => void
  onDelete: (videoId: string) => void
  onView: (videoId: string) => void
}

export default function TrainingVideoCard({
  video,
  onEdit,
  onDelete,
  onView
}: TrainingVideoCardProps) {
  const { isSaved, toggleSave } = useSavedItems()
  const [savingItem, setSavingItem] = useState(false)
  
  const isVideoSaved = isSaved('video', video.id)
  
  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setSavingItem(true)
    await toggleSave('video', video.id)
    setSavingItem(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <TooltipProvider>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        {/* Thumbnail */}
        <div className="relative group cursor-pointer" onClick={() => onView(video.id)}>
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
            <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {/* Botão Salvar no canto superior direito */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleToggleSave}
                disabled={savingItem}
                className={`absolute top-2 right-2 h-8 w-8 p-0 rounded-full shadow-md transition-all ${
                  isVideoSaved 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                    : 'bg-white/90 hover:bg-white text-gray-700'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isVideoSaved ? 'fill-current' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isVideoSaved ? "Remover dos salvos" : "Salvar vídeo"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600" onClick={() => onView(video.id)}>
            {video.title}
          </h3>

          {/* Description */}
          {video.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {video.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(video.createdAt)}
            </div>
            {video.category && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {video.category}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(video.id)}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Assistir
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(video)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(video.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
