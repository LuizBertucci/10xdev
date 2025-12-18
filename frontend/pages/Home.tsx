import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Code2, Play, MessageCircle, Users, FileCode, Calendar, Video as VideoIcon } from "lucide-react"
import { videoService, type Video } from "@/services/videoService"
import { projectService, type Project } from "@/services"
import { cardFeatureService } from "@/services/cardFeatureService"

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
  const [stats, setStats] = useState<{ totalCards: number; totalVideos: number; totalProjects: number; cardsByTech: Record<string, number> }>({
    totalCards: 0,
    totalVideos: 0,
    totalProjects: 0,
    cardsByTech: {}
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Carregar vídeos
        const videosRes = await videoService.listVideos()
        if (videosRes?.success && videosRes.data) {
          setVideos(videosRes.data.slice(0, 3))
        }

        // Carregar projetos
        const projectsRes = await projectService.getAll({ limit: 3 })
        if (projectsRes?.success && projectsRes.data) {
          setProjects(projectsRes.data.slice(0, 3))
        }

        // Carregar estatísticas de cards
        const statsRes = await cardFeatureService.getStats()
        if (statsRes?.success && statsRes.data) {
          setStats({
            totalCards: statsRes.data.total || 0,
            totalVideos: videosRes?.data?.length || 0,
            totalProjects: projectsRes?.data?.length || 0,
            cardsByTech: statsRes.data.byTech || {}
          })
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card Códigos */}
          <Card
            className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            onClick={() => platformState.setActiveTab("codes")}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <Code2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Códigos</h3>
              <p className="text-gray-600 text-sm">
                {loading ? "Carregando..." : `${stats.totalCards} cards disponíveis`}
              </p>
            </CardContent>
          </Card>

          {/* Card Vídeos */}
          <Card
            className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            onClick={() => platformState.setActiveTab("videos")}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
                <VideoIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Videoaulas</h3>
              <p className="text-gray-600 text-sm">
                {loading ? "Carregando..." : `${stats.totalVideos} videoaulas disponíveis`}
              </p>
            </CardContent>
          </Card>

          {/* Card Projetos */}
          <Card
            className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            onClick={() => platformState.setActiveTab("projects")}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                <FileCode className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Projetos</h3>
              <p className="text-gray-600 text-sm">
                {loading ? "Carregando..." : `${stats.totalProjects} projetos disponíveis`}
              </p>
            </CardContent>
          </Card>
          
          {/* Card Comunidade WhatsApp - Destacado */}
          <Card 
            className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 text-white hover:shadow-2xl hover:scale-[1.05] transition-all duration-300 cursor-pointer border-0 shadow-lg"
            onClick={() => window.open('https://chat.whatsapp.com/BdMZsIsUsDv7F2KAXVBatb?mode=hqrc', '_blank')}
          >
            <CardContent className="p-6 flex flex-col h-full">
              <div className="w-14 h-14 bg-white/25 rounded-xl flex items-center justify-center mb-4 ring-2 ring-white/30">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-2 text-white">Comunidade WhatsApp</h3>
              <p className="text-white/95 text-sm mb-4 flex-1">
                Conecte-se com desenvolvedores, compartilhe conhecimento e colabore em projetos.
              </p>
              <Button 
                variant="secondary" 
                className="w-full bg-white text-green-600 hover:bg-gray-50 font-semibold shadow-md hover:shadow-lg transition-shadow"
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
                  <CardTitle className="text-lg line-clamp-2 cursor-pointer hover:text-blue-600" onClick={() => handleViewVideo(video.id)}>
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