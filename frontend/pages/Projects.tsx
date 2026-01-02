"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, FileCode, Calendar, Trash2, Github, Loader2, AlertTriangle } from "lucide-react"
import { projectService, type Project, type GithubRepoInfo } from "@/services"
import { toast } from "sonner"
import { useProjectImportJobs } from "@/hooks/useProjectImportJobs"
import { IMPORT_JOB_LS_KEY, defaultMessage } from "@/lib/importJobUtils"
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
import { Checkbox } from "@/components/ui/checkbox"

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
  const [createDialogTab, setCreateDialogTab] = useState<"manual" | "github">("manual")
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const isFirstSearchEffect = useRef(true)

  // GitHub integration states
  const [githubUrl, setGithubUrl] = useState("")
  const [githubToken, setGithubToken] = useState("")
  const [loadingGithub, setLoadingGithub] = useState(false)
  const [importingGithub, setImportingGithub] = useState(false)
  const [githubRepoInfo, setGithubRepoInfo] = useState<GithubRepoInfo | null>(null)
  const [useAiImport, setUseAiImport] = useState(false)
  const [memberEmailToAdd, setMemberEmailToAdd] = useState("")

  // Delete dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Hook para detectar jobs de importação em andamento
  const projectIds = projects.map(p => p.id)
  const { hasRunningImport, getImportInfo } = useProjectImportJobs(projectIds)

  const isValidGithubUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      if (urlObj.hostname !== 'github.com') return false
      const parts = urlObj.pathname.split('/').filter(Boolean)
      return parts.length >= 2
    } catch {
      return false
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  // Auto buscar info do repo quando colar URL válida
  useEffect(() => {
    if (!githubUrl.trim()) {
      setGithubRepoInfo(null)
      return
    }
    if (!isValidGithubUrl(githubUrl)) return

    const timeoutId = setTimeout(() => {
      handleAnalyzeGithub(false)
    }, 500)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubUrl, githubToken])

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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Nome do projeto é obrigatório')
      return
    }

    try {
      setCreating(true)
      const response = await projectService.create({
        name: newProjectName,
        description: newProjectDescription || undefined
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

  const resetFormAndClose = () => {
    setIsCreateDialogOpen(false)
    setCreateDialogTab("manual")
    setNewProjectName("")
    setNewProjectDescription("")
    setGithubUrl("")
    setGithubToken("")
    setGithubRepoInfo(null)
    setUseAiImport(false)
    setMemberEmailToAdd("")
  }

  const handleAnalyzeGithub = async (showToasts = true) => {
    if (!githubUrl.trim()) {
      if (showToasts) toast.error('URL do GitHub é obrigatória')
      return
    }
    if (!isValidGithubUrl(githubUrl)) {
      if (showToasts) toast.error('URL inválida. Use: https://github.com/usuario/repositorio')
      return
    }

    try {
      setLoadingGithub(true)
      const response = await projectService.getGithubInfo({ url: githubUrl, token: githubToken || undefined })
      if (response?.success && response.data) {
        setGithubRepoInfo(response.data)
        setNewProjectName(response.data.name)
        setNewProjectDescription(response.data.description || "")
        if (showToasts) toast.success(`Repositório${response.data.isPrivate ? ' privado' : ''} encontrado!`)
      } else if (showToasts) {
        toast.error(response?.error || 'Erro ao buscar informações do repositório')
      }
    } catch (error: any) {
      if (showToasts) toast.error(error?.message || 'Erro ao buscar informações do repositório')
    } finally {
      setLoadingGithub(false)
    }
  }

  const handleImportFromGithub = async () => {
    if (!githubUrl.trim()) { toast.error('URL do GitHub é obrigatória'); return }
    if (!newProjectName.trim()) { toast.error('Nome do projeto é obrigatório'); return }

    try {
      setImportingGithub(true)
      const response = await projectService.importFromGithub({
        url: githubUrl,
        token: githubToken || undefined,
        name: newProjectName,
        description: newProjectDescription || undefined,
        useAi: useAiImport,
        addMemberEmail: memberEmailToAdd.trim() || undefined
      })

      if (response?.success && response.data) {
        const { project, jobId } = response.data
        toast.success('Importação iniciada! Abrindo o projeto...')
        try {
          localStorage.setItem(IMPORT_JOB_LS_KEY, JSON.stringify({ jobId, projectId: project.id, createdAt: new Date().toISOString() }))
        } catch { /* ignore */ }

        if (platformState?.setActiveTab) {
          const params = new URLSearchParams()
          params.set('tab', 'projects')
          params.set('id', project.id)
          params.set('jobId', jobId)
          router.push(`/?${params.toString()}`)
        } else {
          router.push(`/projects/${project.id}?jobId=${encodeURIComponent(jobId)}`)
        }

        resetFormAndClose()
        loadProjects()
      } else {
        toast.error(response?.error || 'Erro ao importar projeto')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao importar projeto do GitHub')
    } finally {
      setImportingGithub(false)
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

  const openDeleteDialog = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    const importInfo = getImportInfo(project.id)
    if (importInfo) {
      toast.error(`Importação em andamento (${importInfo.progress}%). Aguarde a conclusão para excluir este projeto.`)
      return
    }
    setProjectToDelete(project)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return
    try {
      setDeleting(true)
      const response = await projectService.delete(projectToDelete.id)
      if (!response) {
        toast.error('Nenhuma resposta do servidor ao deletar o projeto.')
        return
      }
      if (response.success) {
        toast.success('Projeto deletado com sucesso!')
        setIsDeleteDialogOpen(false)
        setProjectToDelete(null)
        loadProjects()
      } else {
        toast.error(response.error || 'Erro ao deletar projeto')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao deletar projeto')
    } finally {
      setDeleting(false)
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
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) resetFormAndClose()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Criar Novo Projeto</DialogTitle>
              <DialogDescription>
                Crie manualmente ou importe diretamente do GitHub.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-1">
              <Tabs value={createDialogTab} onValueChange={(v) => setCreateDialogTab(v as "manual" | "github")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
                  <TabsTrigger value="manual" className="text-base">
                    <Plus className="h-4 w-4 mr-2" />
                    Manual
                  </TabsTrigger>
                  <TabsTrigger value="github" className="text-base">
                    <Github className="h-4 w-4 mr-2" />
                    Importar do GitHub
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-5 mt-0">
                  <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 space-y-4">
                    <h3 className="font-semibold text-gray-900">Informações do Projeto</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nome do Projeto *</Label>
                        <Input id="name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Ex: E-commerce Completo" className="mt-1.5 h-11" />
                      </div>
                      <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea id="description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} placeholder="Descreva o objetivo do projeto..." rows={4} className="mt-1.5 resize-none" />
                      </div>
                      <div>
                        <Label htmlFor="member-email">Email do membro (opcional)</Label>
                        <Input id="member-email" value={memberEmailToAdd} onChange={(e) => setMemberEmailToAdd(e.target.value)} placeholder="usuario@empresa.com" className="mt-1.5 h-11" />
                        <p className="text-xs text-gray-500 mt-2">Se o email existir no sistema, o usuário será adicionado ao projeto.</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="github" className="space-y-5 mt-0">
                  <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      Repositório GitHub
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="github-url">URL do Repositório *</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Input id="github-url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/usuario/repositorio" className="flex-1 h-11" />
                          <Button onClick={() => handleAnalyzeGithub(true)} disabled={loadingGithub || !githubUrl.trim()} variant="outline" className="h-11 px-4">
                            {loadingGithub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="github-token">Token de Acesso (opcional)</Label>
                        <Input id="github-token" type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" className="mt-1.5 h-11" />
                        <p className="text-xs text-gray-500 mt-2">Necessário apenas para repositórios privados</p>
                      </div>

                      {githubRepoInfo && (
                        <div className="rounded-lg bg-green-50 p-4 border-2 border-green-200">
                          <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
                            Repositório encontrado!
                            {githubRepoInfo.isPrivate && <Badge variant="secondary" className="text-xs bg-gray-800 text-white">Privado</Badge>}
                          </p>
                          <p className="text-xs text-green-700 mt-1">Clique em “Importar Projeto” para criar os cards automaticamente.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 space-y-4">
                    <h3 className="font-semibold text-gray-900">Configurações de Importação</h3>
                    <div className="flex items-start gap-3 rounded-lg border-2 border-indigo-100 bg-indigo-50/50 p-4">
                      <Checkbox id="use-ai-import" checked={useAiImport} onCheckedChange={(checked) => setUseAiImport(checked === true)} disabled={importingGithub} className="mt-1" />
                      <div className="space-y-1 flex-1">
                        <label htmlFor="use-ai-import" className="text-sm font-semibold leading-none text-indigo-900 cursor-pointer">Usar IA para organizar os cards</label>
                        <p className="text-xs text-indigo-700 leading-relaxed">Opcional. Se falhar, a importação usa heurísticas.</p>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="member-email-github">Email do membro (opcional)</Label>
                      <Input id="member-email-github" value={memberEmailToAdd} onChange={(e) => setMemberEmailToAdd(e.target.value)} placeholder="usuario@empresa.com" disabled={importingGithub} className="mt-1.5 h-11" />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="github-name">Nome do Projeto *</Label>
                        <Input id="github-name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="mt-1.5 h-11" />
                      </div>
                      <div>
                        <Label htmlFor="github-description">Descrição</Label>
                        <Textarea id="github-description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} rows={4} className="mt-1.5 resize-none" />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-6 mt-2 bg-white">
              <Button variant="outline" onClick={resetFormAndClose} disabled={creating || importingGithub} className="h-11 px-6">Cancelar</Button>
              {createDialogTab === "manual" ? (
                <Button onClick={handleCreateProject} disabled={creating || !newProjectName.trim()} className="h-11 px-6">
                  {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</> : <><Plus className="h-4 w-4 mr-2" />Criar Projeto</>}
                </Button>
              ) : (
                <Button onClick={handleImportFromGithub} disabled={importingGithub || !githubUrl.trim() || !newProjectName.trim()} className="h-11 px-6">
                  {importingGithub ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</> : <><Github className="h-4 w-4 mr-2" />Importar Projeto</>}
                </Button>
              )}
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
                    <CardTitle>{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription className="mt-2">{project.description}</CardDescription>
                    )}
                  </div>
                  {project.userRole === 'owner' && (
                    hasRunningImport(project.id) ? (
                      <div className="ml-2 flex items-center gap-2" title={defaultMessage(getImportInfo(project.id)?.step ?? '')}>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="text-xs text-gray-600">{getImportInfo(project.id)?.progress}%</span>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={(e) => openDeleteDialog(project, e)} className="ml-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Deletar Projeto
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o projeto <strong>&quot;{projectToDelete?.name}&quot;</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deletando...</> : <><Trash2 className="h-4 w-4 mr-2" />Deletar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
