'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Home from '@/screens/Home'
import { videoService, type Video } from '@/services/videoService'
import { Play } from 'lucide-react'

export default function PublicHome() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await videoService.listVideos()
        if (res?.success && res.data) {
          setVideos(res.data.slice(0, 1))
        }
      } catch (error) {
        // Em modo público pode falhar (ex: endpoint privado). Só não exibimos a seção.
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao carregar videoaulas (PublicHome):', error)
        }
      }
    }
    loadVideos()
  }, [])

  const goToLoginWithRedirect = (redirectTo: string) => {
    router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-x-hidden">
      <header className="bg-white/80 shadow-sm border-b backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Zap className="h-7 w-7 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">10xDev</span>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/register">Criar conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Home isPublic />

        {/* Sessão de vídeos (landing pública) */}
        {videos.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Conteúdo</h2>
              <Button
                variant="outline"
                className="shrink-0 bg-white/70"
                onClick={() => goToLoginWithRedirect('/?tab=videos')}
              >
                Ver todos
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {videos.map((video) => (
                <Card key={video.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => goToLoginWithRedirect(`/?tab=videos&id=${video.id}`)}
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                      <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle
                      className="text-lg line-clamp-2 cursor-pointer hover:text-blue-600"
                      onClick={() => goToLoginWithRedirect(`/?tab=videos&id=${video.id}`)}
                    >
                      {video.title}
                    </CardTitle>
                    {video.description && (
                      <CardDescription className="line-clamp-2">
                        {video.description}
                      </CardDescription>
                    )}
                    {video.category && (
                      <CardDescription className="text-xs mt-1">
                        {video.category}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={() => goToLoginWithRedirect(`/?tab=videos&id=${video.id}`)}>
                      <Play className="h-4 w-4 mr-2" />
                      Assistir
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

