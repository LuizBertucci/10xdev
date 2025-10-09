"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search, Video, Pencil, Trash2 } from "lucide-react"
import { useTrainingVideos } from "@/hooks/useTrainingVideos"
import YouTubeVideo from "@/components/youtube-video"
import AddVideoSheet from "@/components/add-video-sheet"
import AulasMenu from "@/components/aulas-menu"
import { Button } from "@/components/ui/button"

export default function Trainings() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)

  const trainingVideos = useTrainingVideos()

  // Filter videos by search term
  const filteredVideos = trainingVideos.videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Handle add video
  const handleAddVideo = async (data: { title: string; url: string; description?: string }) => {
    await trainingVideos.createVideo({
      title: data.title,
      youtubeUrl: data.url,
      description: data.description
    })
    setIsAddVideoOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Menu */}
      <AulasMenu onAddVideo={() => setIsAddVideoOpen(true)} />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar vídeos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full"
        />
      </div>

      {/* Empty State */}
      {filteredVideos.length === 0 && !searchTerm && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum vídeo adicionado
          </h3>
          <p className="text-gray-600 mb-6">
            Comece adicionando vídeos do YouTube para organizar seus treinamentos
          </p>
        </div>
      )}

      {/* Empty Search State */}
      {filteredVideos.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum vídeo encontrado
          </h3>
          <p className="text-gray-600">
            Tente ajustar sua busca ou adicione novos vídeos
          </p>
        </div>
      )}

      {/* Videos Grid */}
      {filteredVideos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredVideos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Video Player */}
              <div className="aspect-video">
                <YouTubeVideo url={video.youtubeUrl} mode="preview" className="h-full" />
              </div>

              {/* Video Info */}
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-lg text-gray-900">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => trainingVideos.startEditing(video)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir este vídeo?')) {
                        trainingVideos.deleteVideo(video.id)
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Video Modal */}
      <AddVideoSheet
        isOpen={isAddVideoOpen}
        onClose={() => setIsAddVideoOpen(false)}
        onSubmit={handleAddVideo}
      />
    </div>
  )
}
