import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Star, Download, GitBranch } from "lucide-react"

interface ProjectTemplate {
  id: string
  title: string
  description: string
  tech: string[]
  difficulty: string
  stars: number
  downloads: string
  requirements: string[]
}

export default function Projects() {
  const projectTemplates: ProjectTemplate[] = [
    {
      id: "1",
      title: "E-commerce React",
      description: "Template completo de e-commerce com React e Firebase",
      tech: ["React", "Firebase", "Stripe"],
      difficulty: "Avançado",
      stars: 1250,
      downloads: "5.2k",
      requirements: ["Node.js v16+", "Firebase Account", "Stripe Account"],
    },
    {
      id: "2",
      title: "Dashboard Admin Vue",
      description: "Template de dashboard administrativo com Vue.js e Tailwind CSS",
      tech: ["Vue.js", "Tailwind CSS", "Chart.js"],
      difficulty: "Intermediário",
      stars: 890,
      downloads: "3.8k",
      requirements: ["Node.js v16+", "Vue CLI"],
    },
    {
      id: "3",
      title: "API REST Node.js",
      description: "Template de API REST com Node.js, Express e MongoDB",
      tech: ["Node.js", "Express", "MongoDB"],
      difficulty: "Intermediário",
      stars: 650,
      downloads: "2.5k",
      requirements: ["Node.js v16+", "MongoDB Atlas Account"],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Templates de Projetos</h1>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">+50k downloads este mês</span>
        </div>
      </div>

      <div className="space-y-6">
        {projectTemplates.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{project.title}</h3>
                      <p className="text-gray-600 mt-1">{project.description}</p>
                    </div>
                    <Badge variant="secondary">{project.difficulty}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech, techIndex) => (
                      <Badge key={techIndex} variant="outline">
                        {tech}
                      </Badge>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Requisitos do Projeto:</h4>
                    <ul className="space-y-1">
                      {project.requirements.map((req, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">{project.stars}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Download className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{project.downloads}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full">
                      <GitBranch className="h-4 w-4 mr-2" />
                      Clonar Repositório
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download ZIP
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 text-center">
                    Inclui documentação completa e guia de setup
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}