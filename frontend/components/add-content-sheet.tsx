"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, FileText, X } from "lucide-react"
import { extractYouTubeVideoId } from "./youtube-video"
import { ContentType, contentService } from "@/services/contentService"

interface AddContentSheetProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { title: string; url?: string; description?: string; markdownContent?: string; fileUrl?: string }) => Promise<void>
  editMode?: boolean
  contentType: ContentType
  initialData?: {
    title: string
    url?: string
    description?: string
    markdownContent?: string
    fileUrl?: string
  }
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  [ContentType.VIDEO]: 'Vídeo',
  [ContentType.POST]: 'Post'
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
  
  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isVideo = contentType === ContentType.VIDEO
  const typeLabel = CONTENT_TYPE_LABELS[contentType]

  // Load initial data in edit mode
  useEffect(() => {
    if (isOpen && editMode && initialData) {
      setUrl(initialData.url || "")
      setTitle(initialData.title)
      setDescription(initialData.description || "")
      setMarkdownContent(initialData.markdownContent || "")
      setUploadedFileUrl(initialData.fileUrl || null)
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
      setPdfFile(null)
      setUploadedFileUrl(null)
      setUploadError(null)
      setIsDragging(false)
    }
  }, [isOpen])

  // Formatar tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Handlers de drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setUploadError(null)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === 'application/pdf') {
        setPdfFile(file)
        setUploadedFileUrl(null)
      } else {
        setUploadError('Apenas arquivos PDF são permitidos')
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === 'application/pdf') {
        setPdfFile(file)
        setUploadedFileUrl(null)
      } else {
        setUploadError('Apenas arquivos PDF são permitidos')
      }
    }
  }

  const handleRemoveFile = () => {
    setPdfFile(null)
    setUploadedFileUrl(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
      let fileUrl = uploadedFileUrl

      // Se há um arquivo PDF novo, fazer upload primeiro
      if (!isVideo && pdfFile && !uploadedFileUrl) {
        setIsUploading(true)
        try {
          const uploadRes = await contentService.uploadFile(pdfFile)
          if (uploadRes?.success && uploadRes.data) {
            fileUrl = uploadRes.data.url
            setUploadedFileUrl(fileUrl)
          } else {
            setUploadError(uploadRes?.error || 'Erro ao fazer upload do arquivo')
            setIsLoading(false)
            setIsUploading(false)
            return
          }
        } catch (uploadErr) {
          console.error('Erro no upload:', uploadErr)
          setUploadError('Erro ao fazer upload do arquivo')
          setIsLoading(false)
          setIsUploading(false)
          return
        }
        setIsUploading(false)
      }

      await onSubmit({
        title,
        url: isVideo ? url : undefined,
        description: description || undefined,
        markdownContent: markdownContent || undefined,
        fileUrl: fileUrl || undefined
      })
      onClose()
    } catch (error) {
      console.error("Erro ao salvar conteúdo:", error)
    } finally {
      setIsLoading(false)
      setIsUploading(false)
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

          {/* Conteúdo Markdown (para posts) */}
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

          {/* Upload de PDF (para posts) */}
          {!isVideo && (
            <div>
              <Label>Arquivo PDF (opcional)</Label>
              
              {/* Zona de drag-and-drop */}
              {!pdfFile && !uploadedFileUrl && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragging 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }
                    ${isLoading ? 'pointer-events-none opacity-50' : ''}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                  <p className="text-sm text-gray-600 mb-1">
                    {isDragging ? 'Solte o arquivo aqui' : 'Arraste um PDF ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-gray-400">Máximo 10MB</p>
                </div>
              )}

              {/* Preview do arquivo selecionado */}
              {(pdfFile || uploadedFileUrl) && (
                <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 border rounded-lg">
                  <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {pdfFile?.name || 'Arquivo PDF'}
                    </p>
                    {pdfFile && (
                      <p className="text-xs text-gray-500">{formatFileSize(pdfFile.size)}</p>
                    )}
                    {uploadedFileUrl && !pdfFile && (
                      <p className="text-xs text-green-600">Arquivo já enviado</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    disabled={isLoading}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Erro de upload */}
              {uploadError && (
                <p className="text-sm text-red-600 mt-2">{uploadError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isUploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isUploading || !title || (isVideo && (!url || !!urlError))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading || isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? 'Enviando arquivo...' : (editMode ? 'Salvando...' : 'Adicionando...')}
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
