import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Code2, Play, Star, GitBranch } from "lucide-react"

interface PlatformState {
  setActiveTab: (tab: string) => void
  setSelectedTech: (tech: string) => void
}

interface HomeProps {
  platformState: PlatformState
}

export default function Home({ platformState }: HomeProps) {
  const quickAccessBlocks = [
    { title: "React Hooks", icon: Code2, color: "bg-blue-500", count: "150+ snippets" },
    { title: "Node.js APIs", icon: Code2, color: "bg-green-500", count: "80+ exemplos" },
    { title: "Python Scripts", icon: Code2, color: "bg-yellow-500", count: "200+ códigos" },
    { title: "CSS Animations", icon: Code2, color: "bg-purple-500", count: "60+ efeitos" },
  ]

  const featuredVideos = [
    { title: "React do Zero ao Avançado", duration: "12h", progress: 65, instructor: "João Silva" },
    { title: "Node.js e Express", duration: "8h", progress: 30, instructor: "Maria Santos" },
    { title: "Python para Data Science", duration: "15h", progress: 0, instructor: "Carlos Lima" },
  ]

  const featuredProjects = [
    {
      title: "E-commerce Completo",
      tech: ["React", "Node.js", "MongoDB"],
      difficulty: "Avançado",
      stars: 1250,
      description: "Sistema completo de e-commerce com carrinho, pagamento e painel admin."
    },
    {
      title: "Dashboard Analytics",
      tech: ["React", "Chart.js", "TypeScript"],
      difficulty: "Intermediário",
      stars: 890,
      description: "Dashboard responsivo com gráficos interativos e métricas em tempo real."
    },
    {
      title: "API REST Node.js",
      tech: ["Node.js", "Express", "PostgreSQL"],
      difficulty: "Intermediário",
      stars: 650,
      description: "API robusta com autenticação JWT, validação e documentação Swagger."
    },
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Acelere seu desenvolvimento com códigos prontos</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Acesse milhares de snippets, videoaulas organizadas e templates de projetos para turbinar sua
          produtividade como desenvolvedor.
        </p>
      </div>

      {/* Quick Access Blocks */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Acesso Rápido por Linguagem</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickAccessBlocks.map((block, index) => (
            <Card
              key={index}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                if (block.title === "Node.js APIs") {
                  platformState.setActiveTab("codes");
                  platformState.setSelectedTech("node.js");
                }
              }}
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 ${block.color} rounded-lg flex items-center justify-center mb-4`}>
                  <block.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{block.title}</h3>
                <p className="text-gray-600 text-sm">{block.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured Videos */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Videoaulas em Destaque</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredVideos.map((video, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{video.title}</CardTitle>
                <CardDescription>
                  Por {video.instructor} • {video.duration}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{video.progress}%</span>
                  </div>
                  <Progress value={video.progress} className="h-2" />
                </div>
                <Button className="w-full mt-4" variant={video.progress > 0 ? "default" : "outline"}>
                  <Play className="h-4 w-4 mr-2" />
                  {video.progress > 0 ? "Continuar" : "Começar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured Projects */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Projetos em Destaque</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredProjects.map((project, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{project.title}</CardTitle>
                  <Badge variant="secondary">{project.difficulty}</Badge>
                </div>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech, techIndex) => (
                      <Badge key={techIndex} variant="outline">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">{project.stars}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (project.title === "Dashboard Analytics") {
                            platformState.setActiveTab("dashboard");
                          }
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Acessar
                      </Button>
                      <Button size="sm">
                        <GitBranch className="h-4 w-4 mr-2" />
                        Clonar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}