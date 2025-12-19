import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Code2, FileCode, MessageCircle, Play, Users } from "lucide-react"
import { videoService, type Video } from "@/services/videoService"
import { projectService, type Project } from "@/services"

interface PlatformState {
  setActiveTab: (tab: string) => void
  setSelectedTech: (tech: string) => void
}

interface HomeProps {
  platformState: PlatformState
}

export default function Home({ platformState }: HomeProps) {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const handleGoToCodes = () => {
    platformState.setSelectedTech("all")
    platformState.setActiveTab("codes")
  }

  useEffect(() => {
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
  }, [])

  const handleViewVideo = (videoId: string) => {
    platformState.setActiveTab("videos")
    router.push(`?tab=videos&id=${videoId}`)
  }

  const handleViewProject = (projectId: string) => {
    platformState.setActiveTab("projects")
    router.push(`?tab=projects&id=${projectId}`)
  }

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-bold text-gray-900">Acelere seu desenvolvimento com códigos prontos</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Acesse milhares de snippets, videoaulas organizadas e templates de projetos para turbinar sua
          produtividade como desenvolvedor.
        </p>
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
      {projects.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Projetos em Destaque</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleViewProject(project.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{project.name}</CardTitle>
                      {project.description && (
                        <CardDescription className="mt-2">{project.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{project.memberCount || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileCode className="h-4 w-4" />
                        <span>{project.cardCount || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}