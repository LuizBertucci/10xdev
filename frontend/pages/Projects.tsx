"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, Users, FileCode, Calendar, Trash2, Github, Loader2, AlertTriangle } from "lucide-react"
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
  const [importStatus, setImportStatus] = useState("")
  const [useAiImport, setUseAiImport] = useState(false)
  const [memberEmailToAdd, setMemberEmailToAdd] = useState("")

  // Delete dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [deleteCards, setDeleteCards] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Validar se é uma URL válida do GitHub
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

  // Auto-buscar info do repo quando colar URL válida
  useEffect(() => {
    if (!githubUrl.trim()) {
      setGithubRepoInfo(null)
      setNewProjectName("")
      setNewProjectDescription("")
      return
    }

    if (!isValidGithubUrl(githubUrl)) {
      return
    }

    // Debounce para evitar muitas requisições
    const timeoutId = setTimeout(() => {
      handleAnalyzeGithub(false) // Sem toasts na busca automática
    }, 500)

    return () => clearTimeout(timeoutId)
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

  const handleAnalyzeGithub = async (showToasts = true) => {
    if (!githubUrl.trim()) {
      if (showToasts) toast.error('URL do GitHub é obrigatória')
      return
    }

    // Não buscar novamente se já temos info dessa URL
    if (githubRepoInfo?.url && githubUrl.includes(githubRepoInfo.url.replace('https://github.com/', ''))) {
      return
    }

    try {
      setLoadingGithub(true)
      const response = await projectService.getGithubInfo({
        url: githubUrl,
        token: githubToken || undefined
      })

      if (!response) {
        if (showToasts) toast.error('Nenhuma resposta do servidor')
        return
      }

      if (response.success && response.data) {
        const { name, description, url, isPrivate } = response.data
        setNewProjectName(name)
        setNewProjectDescription(description || "")
        setGithubRepoInfo(response.data)
        if (showToasts) toast.success(`Repositório${isPrivate ? ' privado' : ''} encontrado!`)
      } else {
        if (showToasts) toast.error(response.error || 'Erro ao buscar informações do repositório')
      }
    } catch (error: any) {
      if (showToasts) toast.error(error.message || 'Erro ao buscar informações do repositório')
    } finally {
      setLoadingGithub(false)
    }
  }

  const handleImportFromGithub = async () => {
    if (!githubUrl.trim()) {
      toast.error('URL do GitHub é obrigatória')
      return
    }

    if (!newProjectName.trim()) {
      toast.error('Nome do projeto é obrigatório')
      return
    }

    try {
      setImportingGithub(true)
      setImportStatus('Iniciando importação e criando o projeto…')

      const response = await projectService.importFromGithub({
        url: githubUrl,
        token: githubToken || undefined,
        name: newProjectName,
        description: newProjectDescription || undefined,
        useAi: useAiImport,
        addMemberEmail: memberEmailToAdd.trim() || undefined
      })

      if (!response) {
        toast.error('Nenhuma resposta do servidor ao importar o projeto.')
        return
      }

      if (response.success && response.data) {
        const { project, jobId } = response.data
        toast.success('Importação iniciada! Abrindo o projeto…')

        // Persistir jobId para continuar mostrando progresso mesmo se o usuário sair do projeto
        try {
          localStorage.setItem(
            'activeImportJob',
            JSON.stringify({ jobId, projectId: project.id, createdAt: new Date().toISOString() })
          )
        } catch {
          // ignore
        }

        // Navegar imediatamente para a tela do projeto (com jobId para progresso realtime)
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
      } else {
        let errorMessage = response.error || 'Erro ao importar projeto'
        if (errorMessage.includes('limite') || errorMessage.includes('rate')) {
          errorMessage = 'Limite de requisições do GitHub atingido. Aguarde alguns minutos ou adicione um token de acesso.'
        } else if (errorMessage.includes('grande') || errorMessage.includes('timeout')) {
          errorMessage = 'O repositório é muito grande. Tente um repositório menor.'
        }
        toast.error(errorMessage)
      }
    } catch (error: any) {
      let errorMessage = error.message || 'Erro ao importar projeto do GitHub'
      if (errorMessage.includes('limite') || errorMessage.includes('rate') || errorMessage.includes('429')) {
        errorMessage = 'Limite de requisições do GitHub atingido. Aguarde alguns minutos ou adicione um token de acesso.'
      } else if (errorMessage.includes('grande') || errorMessage.includes('timeout') || errorMessage.includes('504')) {
        errorMessage = 'O repositório é muito grande. Tente um repositório menor.'
      }
      toast.error(errorMessage)
    } finally {
      setImportingGithub(false)
      setImportStatus('')
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
        addMemberEmail: memberEmailToAdd.trim() || undefined
      })

      if (!response) {
        toast.error('Nenhuma resposta do servidor ao criar o projeto.')
        return
      }

      if (response.success && response.data) {
        toast.success('Projeto criado com sucesso!')
        resetFormAndClose()
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
    setProjectToDelete(project)
    setDeleteCards(false)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return

    try {
      setDeleting(true)
      const response = await projectService.delete(projectToDelete.id, deleteCards)
      if (!response) {
        toast.error('Nenhuma resposta do servidor ao deletar o projeto.')
        return
      }
      if (response.success) {
        toast.success(deleteCards 
          ? 'Projeto e cards deletados com sucesso!' 
          : 'Projeto deletado com sucesso!')
        setIsDeleteDialogOpen(false)
        setProjectToDelete(null)
        loadProjects()
      } else {
        toast.error(response.error || 'Erro ao deletar projeto')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao deletar projeto')
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
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) resetFormAndClose()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Criar Novo Projeto</DialogTitle>
              <DialogDescription>
                Crie um novo projeto manualmente ou importe do GitHub.
              </DialogDescription>
            </DialogHeader>

            {/* Scroll interno para evitar que o footer “saia” da viewport */}
            <div className="flex-1 overflow-y-auto pr-1">
              <Tabs
                value={createDialogTab}
                onValueChange={(v) => setCreateDialogTab(v as "manual" | "github")}
                className="w-full"
              >
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

                <div>
                  <Label htmlFor="member-email">Adicionar membro (email) — opcional</Label>
                  <Input
                    id="member-email"
                    value={memberEmailToAdd}
                    onChange={(e) => setMemberEmailToAdd(e.target.value)}
                    placeholder="usuario@empresa.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se o email existir no sistema, o usuário será adicionado ao projeto automaticamente.
                  </p>
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
                        onClick={() => handleAnalyzeGithub(true)}
                        disabled={loadingGithub || !githubUrl.trim()}
                        variant="outline"
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
                      type="password"
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

                  <div className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                    <Checkbox
                      id="use-ai-import"
                      checked={useAiImport}
                      onCheckedChange={(checked) => setUseAiImport(checked === true)}
                      disabled={importingGithub}
                    />
                    <div className="space-y-1">
                      <label
                        htmlFor="use-ai-import"
                        className="text-sm font-medium leading-none"
                      >
                        Usar IA para organizar os cards (opcional)
                      </label>
                      <p className="text-xs text-gray-600">
                        Quando marcado, o backend pode usar IA para deixar os cards mais parecidos com os exemplos.
                        Quando desmarcado, a importação usa apenas heurísticas (sem gastar créditos).
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="member-email-github">Adicionar membro (email) — opcional</Label>
                    <Input
                      id="member-email-github"
                      value={memberEmailToAdd}
                      onChange={(e) => setMemberEmailToAdd(e.target.value)}
                      placeholder="usuario@empresa.com"
                      disabled={importingGithub}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Se o email existir no sistema, o usuário será adicionado ao projeto automaticamente.
                    </p>
                  </div>

                  {githubRepoInfo && (
                    <div className="rounded-md bg-green-50 p-4 border border-green-200">
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium text-green-800">
                          Repositório encontrado!
                        </p>
                        {githubRepoInfo.isPrivate && (
                          <Badge variant="secondary" className="text-xs">Privado</Badge>
                        )}
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        Clique em "Importar Projeto" para buscar os arquivos e criar os cards automaticamente.
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

                {/* Status de importação */}
                {importingGithub && importStatus && (
                  <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">{importStatus}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Você será levado para a tela do projeto para acompanhar em tempo real.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            </div>

            {/* Footer sticky: sempre visível */}
            <DialogFooter className="flex-shrink-0 border-t pt-4 bg-white">
              <Button
                variant="outline"
                onClick={resetFormAndClose}
                disabled={creating || importingGithub}
              >
                Cancelar
              </Button>

              {createDialogTab === "manual" ? (
                <Button onClick={handleCreateProject} disabled={creating || !newProjectName.trim()}>
                  {creating ? 'Criando...' : 'Criar Projeto'}
                </Button>
              ) : (
                <Button
                  onClick={handleImportFromGithub}
                  disabled={importingGithub || !githubUrl.trim() || !newProjectName.trim()}
                >
                  {importingGithub ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Github className="h-4 w-4 mr-2" />
                      Importar Projeto
                    </>
                  )}
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
                      onClick={(e) => openDeleteDialog(project, e)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Deletar Projeto
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o projeto <strong>"{projectToDelete?.name}"</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {projectToDelete && (projectToDelete.cardCount || 0) > 0 && (
            <div className="space-y-4">
              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <p className="text-sm text-amber-800">
                  Este projeto possui <strong>{projectToDelete.cardCount} cards</strong> associados.
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="deleteCards" 
                  checked={deleteCards}
                  onCheckedChange={(checked) => setDeleteCards(checked === true)}
                />
                <label 
                  htmlFor="deleteCards" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Deletar também os cards do projeto
                </label>
              </div>
              
              {deleteCards && (
                <div className="rounded-md bg-red-50 p-3 border border-red-200">
                  <p className="text-xs text-red-700">
                    ⚠️ Os {projectToDelete.cardCount} cards serão permanentemente deletados e não poderão ser recuperados.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteCards ? 'Deletar Projeto e Cards' : 'Deletar Projeto'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
