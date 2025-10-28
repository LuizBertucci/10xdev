"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Tag, ExternalLink } from "lucide-react"
import YouTubeVideo from "@/components/youtube-video"
import { Button } from "@/components/ui/button"
import { educationalService, type EducationalVideo } from "@/services/educationalService"

export default function EducationalVideoDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [video, setVideo] = useState<EducationalVideo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = params?.id
    if (!id) return
    
    const fetchVideo = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await educationalService.getVideo(String(id))
        if (res.success && res.data) {
          setVideo(res.data)
        } else {
          setError(res.error || 'Vídeo não encontrado')
        }
      } catch (e) {
        setError('Erro ao carregar vídeo')
      } finally {
        setLoading(false)
      }
    }
    
    fetchVideo()
  }, [params?.id])

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  if (loading) {
    return <div className="text-gray-600">Carregando...</div>
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/educacional')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/educacional')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-gray-600">Vídeo não encontrado</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => router.push('/educacional')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900">{video.title}</h1>

      {/* Video Player - Reutilizando YouTubeVideo */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <YouTubeVideo url={video.youtubeUrl} mode="embed" />
      </div>

      {/* Video Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        {/* Description */}
        {video.description && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Descrição</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 pt-4 border-t">
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
          <div className="pt-4 border-t">
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
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => window.open(video.youtubeUrl, '_blank')}
            className="w-full sm:w-auto"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir no YouTube
          </Button>
        </div>
      </div>
    </div>
  )
}

