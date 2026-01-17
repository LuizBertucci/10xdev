"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { extractYouTubeVideoId } from "./youtube-video"
import { ContentType } from "@/services/contentService"

interface AddContentSheetProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { title: string; url?: string; description?: string; markdownContent?: string }) => Promise<void>
  editMode?: boolean
  contentType: ContentType
  initialData?: {
    title: string
    url?: string
    description?: string
    markdownContent?: string
  }
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  [ContentType.VIDEO]: 'Vídeo',
  [ContentType.POST]: 'Post',
  [ContentType.MANUAL]: 'Manual',
  [ContentType.TUTORIAL]: 'Tutorial'
}

export default function AddContentSheet({ isOpen, onClose, onSubmit, editMode = false, contentType, initialData }: AddContentSheetProps) {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [markdownContent, setMarkdownContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingTitle, setIsFetchingTitle] = useState(false)
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  const isVideo = contentType === ContentType.VIDEO
  const typeLabel = CONTENT_TYPE_LABELS[contentType]

  // Load initial data in edit mode
  useEffect(() => {
    if (isOpen && editMode && initialData) {
      setUrl(initialData.url || "")
      setTitle(initialData.title)
      setDescription(initialData.description || "")
      setMarkdownContent(initialData.markdownContent || "")
    }
  }, [isOpen, editMode, initialData])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUrl("")
      setTitle("")
      setDescription("")
      setMarkdownContent("")
      setPreviewThumbnail(null)
      setUrlError(null)
    }
  }, [isOpen])

  // Fetch video title from YouTube API quando URL mudar (apenas para vídeos)
  useEffect(() => {
    if (!isVideo) return

    const fetchVideoTitle = async (videoId: string) => {
      setIsFetchingTitle(true)
      try {
        const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

        if (apiKey) {
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
          )
          const data = await response.json()

          if (data.items && data.items.length > 0) {
            setTitle(data.items[0].snippet.title)
          }
        }
      } catch (error) {
        console.error("Erro ao buscar título do vídeo:", error)
      } finally {
        setIsFetchingTitle(false)
      }
    }

    if (url) {
      const videoId = extractYouTubeVideoId(url)

      if (videoId) {
        setUrlError(null)
        setPreviewThumbnail(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)

        if (!title) {
          fetchVideoTitle(videoId)
        }
      } else {
        setUrlError("URL do YouTube inválida")
        setPreviewThumbnail(null)
      }
    } else {
      setPreviewThumbnail(null)
      setUrlError(null)
    }
  }, [url, isVideo, title])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title) {
      return
    }

    // Validação específica para vídeos
    if (isVideo) {
      if (!url) return
      const videoId = extractYouTubeVideoId(url)
      if (!videoId) {
        setUrlError("URL do YouTube inválida")
        return
      }
    }

    setIsLoading(true)
    try {
      await onSubmit({
        title,
        url: isVideo ? url : undefined,
        description: description || undefined,
        markdownContent: markdownContent || undefined
      })
      onClose()
    } catch (error) {
      console.error("Erro ao salvar conteúdo:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? `Editar ${typeLabel}` : `Adicionar ${typeLabel}`}</DialogTitle>
          <DialogDescription>
            {editMode 
              ? `Edite as informações do ${typeLabel.toLowerCase()}.`
              : `Preencha os campos abaixo para adicionar um novo ${typeLabel.toLowerCase()}.`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL do YouTube (apenas para vídeos) */}
          {isVideo && (
            <div>
              <Label htmlFor="url">URL do YouTube *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className={urlError ? "border-red-500" : ""}
              />
              {urlError && (
                <p className="text-sm text-red-600 mt-1">{urlError}</p>
              )}

              {/* Preview Thumbnail */}
              {previewThumbnail && !urlError && (
                <div className="mt-3 relative">
                  <img
                    src={previewThumbnail}
                    alt="Preview"
                    className="w-full rounded-lg border"
                    onError={() => setPreviewThumbnail(null)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Título */}
          <div>
            <Label htmlFor="title">
              Título *
              {isFetchingTitle && (
                <span className="ml-2 text-xs text-gray-500">
                  <Loader2 className="inline h-3 w-3 animate-spin" /> Buscando título...
                </span>
              )}
            </Label>
            <Input
              id="title"
              type="text"
              placeholder={`Nome do ${typeLabel.toLowerCase()}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading || isFetchingTitle}
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder={`Adicione uma descrição para o ${typeLabel.toLowerCase()}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Conteúdo Markdown (para posts, manuais, tutoriais) */}
          {!isVideo && (
            <div>
              <Label htmlFor="markdownContent">Conteúdo</Label>
              <Textarea
                id="markdownContent"
                placeholder={`Digite o conteúdo do ${typeLabel.toLowerCase()} (suporta Markdown)`}
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                disabled={isLoading}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !title || (isVideo && (!url || !!urlError))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editMode ? 'Salvando...' : 'Adicionando...'}
                </>
              ) : (
                editMode ? 'Salvar Alterações' : `Adicionar ${typeLabel}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
