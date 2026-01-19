'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Home from '@/pages/Home'
import { contentService, ContentType, type Content } from '@/services/contentService'
import { Play } from 'lucide-react'

export default function PublicHome() {
  const router = useRouter()
  const [videos, setVideos] = useState<Content[]>([])

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await contentService.listContents({ type: ContentType.VIDEO, limit: 1 })
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
              <img
                src="/brand/10xDev-logo-fundo-preto.png"
                alt="10xDev"
                className="h-8 w-auto"
              />
              <span className="sr-only">10xDev</span>
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
      </main>
    </div>
  )
}

