import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, X } from "lucide-react"
import { TrainingVideo, CreateTrainingVideoData } from "@/types/training"
import { isValidYouTubeUrl, extractYouTubeVideoId, getYouTubeThumbnail } from "@/utils/youtube"

interface TrainingVideoFormProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  initialData?: TrainingVideo
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: CreateTrainingVideoData) => Promise<void>
}

const DEFAULT_FORM_DATA: CreateTrainingVideoData = {
  title: '',
  description: '',
  youtubeUrl: '',
  category: '',
  tags: []
}

export default function TrainingVideoForm({
  isOpen,
  mode,
  initialData,
  isLoading,
  onClose,
  onSubmit
}: TrainingVideoFormProps) {
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null)

  // Initialize form with initial data
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description || '',
        youtubeUrl: initialData.youtubeUrl || '',
        category: initialData.category || '',
        tags: initialData.tags || []
      })
      setPreviewThumbnail(initialData.thumbnail || null)
      setUrlError(null)
    } else if (mode === 'create') {
      setFormData(DEFAULT_FORM_DATA)
      setPreviewThumbnail(null)
      setUrlError(null)
    }
  }, [mode, initialData, isOpen])

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Validate YouTube URL and show preview
    if (field === 'youtubeUrl' && typeof value === 'string') {
      if (!value) {
        setUrlError(null)
        setPreviewThumbnail(null)
        return
      }

      if (isValidYouTubeUrl(value)) {
        setUrlError(null)
        const videoId = extractYouTubeVideoId(value)
        if (videoId) {
          setPreviewThumbnail(getYouTubeThumbnail(videoId))
        }
      } else {
        setUrlError('URL do YouTube inválida')
        setPreviewThumbnail(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      return
    }

    if (!isValidYouTubeUrl(formData.youtubeUrl || '')) {
      setUrlError('URL do YouTube inválida')
      return
    }

    await onSubmit(formData)
    setFormData(DEFAULT_FORM_DATA)
    setPreviewThumbnail(null)
    setUrlError(null)
  }

  const handleClose = () => {
    setFormData(DEFAULT_FORM_DATA)
    setPreviewThumbnail(null)
    setUrlError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {mode === 'create' ? 'Adicionar Vídeo' : 'Editar Vídeo'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {mode === 'create' 
              ? 'Preencha os campos abaixo para adicionar um novo vídeo.'
              : 'Edite as informações do vídeo.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* YouTube URL */}
          <div>
            <Label htmlFor="youtubeUrl">URL do YouTube *</Label>
            <Input
              id="youtubeUrl"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={formData.youtubeUrl}
              onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
              disabled={isLoading}
              className={urlError ? 'border-red-500' : ''}
            />
            {urlError && (
              <p className="text-sm text-red-600 mt-1">{urlError}</p>
            )}
            {previewThumbnail && (
              <div className="mt-3">
                <img
                  src={previewThumbnail}
                  alt="Preview"
                  className="w-full rounded-lg border"
                />
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              type="text"
              placeholder="Nome do vídeo"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição do vídeo"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isLoading}
              rows={4}
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              type="text"
              placeholder="Ex: Frontend, Backend, DevOps"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title.trim() || !isValidYouTubeUrl(formData.youtubeUrl || '')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Adicionando...' : 'Salvando...'}
                </>
              ) : (
                mode === 'create' ? 'Adicionar' : 'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
