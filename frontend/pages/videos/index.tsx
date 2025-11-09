"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { Search, Plus, Video as VideoIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import AddVideoSheet from "@/components/add-video-sheet"
import TrainingVideoCard from "@/components/TrainingVideoCard"
import { videoService, type Video } from "@/services/videoService"
import { useToast } from "@/hooks/use-toast"

export default function VideosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [videos, setVideos] = useState<Video[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editVideo, setEditVideo] = useState<Video | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; videoId: string | null }>({
    isOpen: false,
    videoId: null
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadVideos = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await videoService.listVideos()
        if (isMounted) {
          if (res.success) {
            // Se não houver vídeos, data será um array vazio, que é válido
            setVideos(res.data || [])
          } else {
            setError(res.error || "Erro ao carregar vídeos")
          }
        }
      } catch (e) {
        console.error('Erro ao carregar vídeos:', e)
        if (isMounted) {
          // Se o erro for um objeto vazio ou não tiver mensagem, usar mensagem padrão
          const errorMessage = e && typeof e === 'object' && 'error' in e 
            ? (e as any).error 
            : e instanceof Error 
              ? e.message 
              : "Erro ao carregar vídeos"
          setError(errorMessage || "Erro ao carregar vídeos")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadVideos()
    return () => { isMounted = false }
  }, [])

  const filtered = videos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    (v.description || "").toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async (data: { title: string; url: string; description?: string }) => {
    try {
      const res = await videoService.createVideo({
        title: data.title,
        youtubeUrl: data.url,
        description: data.description
      })
      if (res.success && res.data) {
        setVideos(prev => [res.data!, ...prev])
        setIsAddOpen(false)
        toast({
          title: "Sucesso!",
          description: "Vídeo adicionado com sucesso.",
        })
      } else {
        toast({
          title: "Erro",
          description: res.error || "Erro ao adicionar vídeo.",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error('Erro ao adicionar vídeo:', e)
      toast({
        title: "Erro",
        description: "Erro ao adicionar vídeo.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (video: any) => {
    const videoToEdit = videos.find(v => v.id === video.id)
    if (videoToEdit) {
      setEditVideo(videoToEdit)
    }
  }

  const handleUpdate = async (data: { title: string; url: string; description?: string }) => {
    if (!editVideo) return

    try {
      const res = await videoService.updateVideo(editVideo.id, {
        title: data.title,
        youtubeUrl: data.url,
        description: data.description
      })
      if (res.success && res.data) {
        setVideos(prev => prev.map(v => v.id === editVideo.id ? res.data! : v))
        setEditVideo(null)
        toast({
          title: "Sucesso!",
          description: "Vídeo atualizado com sucesso.",
        })
      } else {
        toast({
          title: "Erro",
          description: res.error || "Erro ao atualizar vídeo.",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error('Erro ao atualizar vídeo:', e)
      toast({
        title: "Erro",
        description: "Erro ao atualizar vídeo.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, videoId: id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.videoId) return

    setIsDeleting(true)
    try {
      const res = await videoService.deleteVideo(deleteConfirm.videoId)
      if (res.success) {
        setVideos(prev => prev.filter(v => v.id !== deleteConfirm.videoId))
        toast({
          title: "Sucesso!",
          description: "Vídeo excluído com sucesso.",
        })
      } else {
        toast({
          title: "Erro",
          description: res.error || "Erro ao excluir vídeo.",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error('Erro ao deletar vídeo:', e)
      toast({
        title: "Erro",
        description: "Erro ao excluir vídeo.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({ isOpen: false, videoId: null })
    }
  }

  const handleView = (id: string) => {
    router.push(`/videos/${id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Videos</h1>
        <Button onClick={() => setIsAddOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Adicionar vídeo
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar vídeos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 w-full"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-gray-600">Carregando...</div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-red-600">{error}</div>
      )}

      {/* Empty State */}
      {!loading && !error && videos.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <VideoIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum vídeo adicionado
          </h3>
          <p className="text-gray-600 mb-6">
            Comece adicionando vídeos do YouTube para organizar seus conteúdos
          </p>
        </div>
      )}

      {/* Empty Search */}
      {!loading && !error && videos.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12">
          <VideoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum vídeo encontrado
          </h3>
          <p className="text-gray-600">
            Tente ajustar sua busca ou adicione novos vídeos
          </p>
        </div>
      )}

      {/* Videos Grid - Reutilizando TrainingVideoCard */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((video) => (
            <TrainingVideoCard
              key={video.id}
              video={{
                id: video.id,
                title: video.title,
                description: video.description || '',
                youtubeUrl: video.youtubeUrl,
                videoId: video.videoId,
                thumbnail: video.thumbnail,
                category: video.category,
                tags: video.tags || [],
                createdAt: video.createdAt,
                updatedAt: video.updatedAt
              }}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add Video Modal - Reutilizando AddVideoSheet */}
      <AddVideoSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAdd}
      />

      {/* Edit Video Modal */}
      <AddVideoSheet
        isOpen={!!editVideo}
        onClose={() => setEditVideo(null)}
        onSubmit={handleUpdate}
        editMode={true}
        initialData={editVideo ? {
          title: editVideo.title,
          url: editVideo.youtubeUrl,
          description: editVideo.description
        } : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(open) => !isDeleting && setDeleteConfirm({ isOpen: open, videoId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este vídeo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

