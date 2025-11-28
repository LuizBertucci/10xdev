"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, FileCode, Calendar, Trash2, Github, Loader2 } from "lucide-react"
import { projectService, type Project, type GithubRepoInfo } from "@/services"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PlatformState {
  setActiveTab?: (tab: string) => void
}

interface ProjectsProps {
  platformState?: PlatformState
}

export default function Projects({ platformState }: ProjectsProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const isFirstSearchEffect = useRef(true)

  // GitHub integration states
  const [githubUrl, setGithubUrl] = useState("")
  const [githubToken, setGithubToken] = useState("")
  const [loadingGithub, setLoadingGithub] = useState(false)
  const [githubRepoUrl, setGithubRepoUrl] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await projectService.getAll({
        search: searchTerm || undefined,
        sortBy: 'created_at',
        sortOrder: 'desc'
      })

      if (!response) {
        setProjects([])
        return
      }

      if (response.success && response.data) {
        setProjects(response.data)
      } else {
        toast.error(response.error || 'Erro ao carregar projetos')
      }
    } catch (error: any) {
      if (error?.statusCode === 429 || error?.status === 429) {
        toast.error('Muitas requisições. Tente novamente em instantes.')
        return
      }
      toast.error(error?.message || 'Erro ao carregar projetos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isFirstSearchEffect.current) {
      isFirstSearchEffect.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      loadProjects()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleAnalyzeGithub = async () => {
    if (!githubUrl.trim()) {
      toast.error('URL do GitHub é obrigatória')
      return
    }

    try {
      setLoadingGithub(true)
      const response = await projectService.getGithubInfo({
        url: githubUrl,
        token: githubToken || undefined
      })

      if (!response) {
        toast.error('Nenhuma resposta do servidor')
        return
      }

      if (response.success && response.data) {
        const { name, description, url, isPrivate } = response.data
        setNewProjectName(name)
        setNewProjectDescription(description || "")
        setGithubRepoUrl(url)
        toast.success(`Repositório${isPrivate ? ' privado' : ''} carregado com sucesso!`)
      } else {
        toast.error(response.error || 'Erro ao buscar informações do repositório')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar informações do repositório')
    } finally {
      setLoadingGithub(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Nome do projeto é obrigatório')
      return
    }

    try {
      setCreating(true)
      const response = await projectService.create({
        name: newProjectName,
        description: newProjectDescription || undefined,
        repositoryUrl: githubRepoUrl || undefined
      })

      if (!response) {
        toast.error('Nenhuma resposta do servidor ao criar o projeto.')
        return
      }

      if (response.success && response.data) {
        toast.success('Projeto criado com sucesso!')
        setIsCreateDialogOpen(false)
        setNewProjectName("")
        setNewProjectDescription("")
        setGithubUrl("")
        setGithubToken("")
        setGithubRepoUrl(null)
        loadProjects()
      } else {
        toast.error(response.error || 'Erro ao criar projeto')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar projeto')
    } finally {
      setCreating(false)
    }
  }

  const handleProjectClick = (projectId: string) => {
    if (platformState?.setActiveTab) {
      const params = new URLSearchParams()
      params.set('tab', 'projects')
      params.set('id', projectId)
      router.push(`/?${params.toString()}`)
    } else {
      router.push(`/projects/${projectId}`)
    }
  }

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja deletar este projeto? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await projectService.delete(projectId)
      if (!response) {
        toast.error('Nenhuma resposta do servidor ao deletar o projeto.')
        return
      }
      if (response.success) {
        toast.success('Projeto deletado com sucesso!')
        loadProjects()
      } else {
        toast.error(response.error || 'Erro ao deletar projeto')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao deletar projeto')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projetos</h1>
          <p className="text-gray-600 mt-1">Gerencie seus projetos e equipes</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Projeto</DialogTitle>
              <DialogDescription>
                Crie um novo projeto manualmente ou importe do GitHub.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="github">
                  <Github className="h-4 w-4 mr-2" />
                  Importar do GitHub
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Projeto *</Label>
                  <Input
                    id="name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ex: E-commerce Completo"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Descreva o objetivo do projeto..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="github" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="github-url">URL do Repositório *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="github-url"
                        name="github-repository-url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/usuario/repositorio"
                        className="flex-1"
                        autoComplete="off"
                        type="text"
                        data-form-type="other"
                      />
                      <Button
                        onClick={handleAnalyzeGithub}
                        disabled={loadingGithub || !githubUrl.trim()}
                      >
                        {loadingGithub ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="github-token">Token (opcional para repos privados)</Label>
                    <Input
                      id="github-token"
                      name="github-access-token"
                      type="text"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxx"
                      autoComplete="new-password"
                      data-form-type="other"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Necessário apenas para repositórios privados
                    </p>
                  </div>

                  {githubRepoUrl && (
                    <div className="rounded-md bg-green-50 p-4 border border-green-200">
                      <p className="text-sm font-medium text-green-800">
                        Repositório carregado com sucesso!
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Você pode editar o nome e descrição abaixo antes de criar.
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="github-name">Nome do Projeto *</Label>
                    <Input
                      id="github-name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Nome será preenchido automaticamente"
                    />
                  </div>

                  <div>
                    <Label htmlFor="github-description">Descrição</Label>
                    <Textarea
                      id="github-description"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Descrição será preenchida automaticamente"
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateProject} disabled={creating}>
                {creating ? 'Criando...' : 'Criar Projeto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar projetos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando projetos...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum projeto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleProjectClick(project.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{project.name}</CardTitle>
                      {project.repositoryUrl && (
                        <a
                          href={project.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="Ver repositório no GitHub"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {project.description && (
                      <CardDescription className="mt-2">{project.description}</CardDescription>
                    )}
                  </div>
                  {project.userRole === 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
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
                  {project.userRole && (
                    <Badge variant={project.userRole === 'owner' ? 'default' : 'secondary'}>
                      {project.userRole === 'owner' ? 'Owner' : 
                       project.userRole === 'admin' ? 'Admin' : 'Member'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
