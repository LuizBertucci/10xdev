import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TrainingVideo } from "@/types/training"
import { X, ExternalLink, Calendar, Tag, Pencil, Trash2 } from "lucide-react"
import { getYouTubeEmbedUrl } from "@/utils/youtube"

interface TrainingVideoModalProps {
  isOpen: boolean
  video: TrainingVideo | null
  onClose: () => void
  onEdit?: (video: TrainingVideo) => void
  onDelete?: (videoId: string) => void
}

export default function TrainingVideoModal({
  isOpen,
  video,
  onClose,
  onEdit,
  onDelete
}: TrainingVideoModalProps) {
  if (!video) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{video.title}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* YouTube Player */}
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={getYouTubeEmbedUrl(video.videoId)}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full rounded-lg"
            />
          </div>

          {/* Video Info */}
          <div className="space-y-4">
            {/* Description */}
            {video.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Descrição</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{video.description}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Adicionado em {formatDate(video.createdAt)}
              </div>
              {video.category && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {video.category}
                </div>
              )}
            </div>

            {/* Tags */}
            {video.tags && video.tags.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {video.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => window.open(video.youtubeUrl, '_blank')}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no YouTube
              </Button>
              {onEdit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onEdit(video)
                    onClose()
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir este vídeo?')) {
                      onDelete(video.id)
                      onClose()
                    }
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
