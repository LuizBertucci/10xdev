import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Code2, FileCode, MessageCircle, Play, Users, ArrowRight, Sparkles, FolderKanban, ChevronRight } from "lucide-react"
import { videoService, type Video } from "@/services/videoService"
import { projectService, type Project } from "@/services"

interface PlatformState {
  setActiveTab: (tab: string) => void
  setSelectedTech: (tech: string) => void
}

interface HomeProps {
  platformState?: PlatformState
  /**
   * Quando true, a tela funciona como landing pública:
   * - não chama APIs privadas
   * - cliques que dependem do app redirecionam para /login com ?redirect=...
   */
  isPublic?: boolean
}

export default function Home({ platformState, isPublic = false }: HomeProps) {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const goToLoginWithRedirect = (redirectTo: string) => {
    router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`)
  }

  const handleGoToCodes = () => {
    if (isPublic) {
      goToLoginWithRedirect('/?tab=codes')
      return
    }
    platformState?.setSelectedTech("all")
    platformState?.setActiveTab("codes")
  }

  const handleGoToVideos = () => {
    if (isPublic) {
      goToLoginWithRedirect('/?tab=videos')
      return
    }
    platformState?.setActiveTab("videos")
  }

  useEffect(() => {
    if (isPublic) return

    const loadVideos = async () => {
      try {
        const res = await videoService.listVideos()
        if (res?.success && res.data) {
          setVideos(res.data.slice(0, 3))
        }
      } catch (error) {
        console.error('Erro ao carregar videoaulas:', error)
      }
    }

    const loadProjects = async () => {
      try {
        const res = await projectService.getAll({ limit: 3 })
        if (res?.success && res.data) {
          setProjects(res.data.slice(0, 3))
        }
      } catch (error) {
        console.error('Erro ao carregar projetos:', error)
      }
    }

    loadVideos()
    loadProjects()
  }, [isPublic])

  const handleViewVideo = (videoId: string) => {
    if (isPublic) {
      goToLoginWithRedirect(`/?tab=videos&id=${videoId}`)
      return
    }
    platformState?.setActiveTab("videos")
    router.push(`?tab=videos&id=${videoId}`)
  }

  const handleViewProject = (projectId: string) => {
    if (isPublic) {
      goToLoginWithRedirect(`/?tab=projects&id=${projectId}`)
      return
    }
    platformState?.setActiveTab("projects")
    router.push(`?tab=projects&id=${projectId}`)
  }

  const handleGoToProjects = () => {
    if (isPublic) {
      goToLoginWithRedirect('/?tab=projects')
      return
    }
    platformState?.setActiveTab("projects")
  }

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-white px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-gray-700">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Plataforma de produtividade para devs
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            Devs,{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              bora construir Brasil
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            A 10xDev surgiu com o intuito de equipar os programadores para alcançarem o ápice da produtividade e, com isso, construir o futuro do nosso país.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Card
                className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer border-2 border-blue-400/30"
                onClick={handleGoToCodes}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Code2 className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm text-white">Códigos</h3>
                </CardContent>
              </Card>

              <Card
                className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer border-2 border-indigo-400/30"
                onClick={handleGoToVideos}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm text-white">Vídeos</h3>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card
                className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer border-2 border-emerald-400/30"
                onClick={handleGoToProjects}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm text-white">Projetos</h3>
                </CardContent>
              </Card>

              <Card
                className="bg-gradient-to-br from-emerald-500 to-lime-600 text-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer border-2 border-emerald-300/30"
                onClick={() => window.open('https://chat.whatsapp.com/BdMZsIsUsDv7F2KAXVBatb?mode=hqrc', '_blank')}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm text-white">WhatsApp</h3>
                </CardContent>
              </Card>
            </div>
          </div>

          {!isPublic && (
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
              <div className="rounded-xl border bg-white/60 px-4 py-3">
                <div className="font-semibold text-gray-900">Snippets</div>
                <div className="text-gray-600">cards prontos e reutilizáveis</div>
              </div>
              <div className="rounded-xl border bg-white/60 px-4 py-3">
                <div className="font-semibold text-gray-900">Vídeos</div>
                <div className="text-gray-600">aprenda com contexto e prática</div>
              </div>
              <div className="rounded-xl border bg-white/60 px-4 py-3">
                <div className="font-semibold text-gray-900">Projetos</div>
                <div className="text-gray-600">organize cards por objetivo</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Blocks */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Acesso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer border-0"
            onClick={handleGoToCodes}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <Code2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-white">Códigos</h3>
              <p className="text-white/90 text-sm">Ver todos os snippets e cards</p>
              <Button
                variant="secondary"
                className="w-full mt-4 bg-white text-blue-700 hover:bg-gray-100 font-medium"
                onClick={(e) => {
                  e.stopPropagation()
                  handleGoToCodes()
                }}
              >
                Acessar Códigos
              </Button>
            </CardContent>
          </Card>

          {/* Card Comunidade WhatsApp */}
          <Card
            className="bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer border-0"
            onClick={() => window.open('https://chat.whatsapp.com/BdMZsIsUsDv7F2KAXVBatb?mode=hqrc', '_blank')}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-white">Comunidade WhatsApp</h3>
              <p className="text-white/90 text-sm mb-4">
                Conecte-se com desenvolvedores, compartilhe conhecimento e colabore em projetos.
              </p>
              <Button
                variant="secondary"
                className="w-full bg-white text-green-600 hover:bg-gray-100 font-medium"
              >
                Entrar na comunidade
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Featured Videos */}
      {videos.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Videoaulas em Destaque</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                <div className="relative group cursor-pointer" onClick={() => handleViewVideo(video.id)}>
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
                    onClick={() => handleViewVideo(video.id)}
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
                  <Button className="w-full" onClick={() => handleViewVideo(video.id)}>
                    <Play className="h-4 w-4 mr-2" />
                    Assistir
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Featured Projects */}
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Projetos</h2>
          </div>
          <Button
            variant="outline"
            className="shrink-0 bg-white/70"
            onClick={handleGoToProjects}
          >
            Ver todos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer hover:shadow-lg transition-all bg-white/80 backdrop-blur border-white/60"
                onClick={() => handleViewProject(project.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5 h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate">{project.name}</CardTitle>
                        {project.description && (
                          <CardDescription className="mt-1 line-clamp-2">{project.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-700 transition-colors mt-1" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <div className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1">
                      <Users className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">{project.memberCount || 0}</span>
                      <span className="text-gray-500">membros</span>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1">
                      <FileCode className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">{project.cardCount || 0}</span>
                      <span className="text-gray-500">cards</span>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-600">{new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white/80 border-dashed">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shrink-0">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Crie seu primeiro projeto</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Organize cards por objetivo (ex.: “App”, “API”, “Landing”) e compartilhe com seu time.
                    </div>
                  </div>
                </div>
                <Button onClick={handleGoToProjects} className="w-full sm:w-auto">
                  Novo Projeto
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}