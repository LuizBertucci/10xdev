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
import { useProjectImportJobs } from "@/hooks/useProjectImportJobs"
import { defaultMessage } from "@/lib/importJobUtils"
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

  // Hook para detectar jobs de importação em andamento
  const projectIds = projects.map(p => p.id)
  const { hasRunningImport, getImportInfo } = useProjectImportJobs(projectIds)

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

    // VALIDAÇÃO: Verificar se há job de importação em andamento
    const importInfo = getImportInfo(project.id)
    if (importInfo) {
      toast.error(
        `Importação em andamento (${importInfo.progress}%). ` +
        `Aguarde a conclusão para excluir este projeto.`
      )
      return
    }

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
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0 pb-6 border-b">
              <DialogTitle className="text-2xl font-bold">Criar Novo Projeto</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Crie um novo projeto manualmente ou importe diretamente do GitHub.
              </DialogDescription>
            </DialogHeader>

            {/* Scroll interno para evitar que o footer "saia" da viewport */}
            <div className="flex-1 overflow-y-auto pr-1">
              <Tabs
                value={createDialogTab}
                onValueChange={(v) => setCreateDialogTab(v as "manual" | "github")}
                className="w-full"
              >
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
                {/* Card: Informações Básicas */}
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-blue-600" />
                    </div>
                    Informações do Projeto
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Nome do Projeto *
                      </Label>
                      <Input
                        id="name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Ex: E-commerce Completo"
                        className="mt-1.5 h-11"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="Descreva o objetivo do projeto..."
                        rows={4}
                        className="mt-1.5 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Card: Adicionar Membros */}
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    Colaboradores <span className="text-sm font-normal text-gray-500">(Opcional)</span>
                  </h3>

                  <div>
                    <Label htmlFor="member-email" className="text-sm font-medium text-gray-700">
                      Email do membro
                    </Label>
                    <Input
                      id="member-email"
                      value={memberEmailToAdd}
                      onChange={(e) => setMemberEmailToAdd(e.target.value)}
                      placeholder="usuario@empresa.com"
                      className="mt-1.5 h-11"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-start gap-1.5">
                      <svg className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>Se o email existir no sistema, o usuário será adicionado ao projeto automaticamente.</span>
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="github" className="space-y-5 mt-0">
                {/* Card: Conectar ao GitHub */}
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center">
                      <Github className="h-4 w-4 text-white" />
                    </div>
                    Repositório GitHub
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="github-url" className="text-sm font-medium text-gray-700">
                        URL do Repositório *
                      </Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          id="github-url"
                          name="github-repository-url"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          placeholder="https://github.com/usuario/repositorio"
                          className="flex-1 h-11"
                          autoComplete="off"
                          type="text"
                          data-form-type="other"
                        />
                        <Button
                          onClick={() => handleAnalyzeGithub(true)}
                          disabled={loadingGithub || !githubUrl.trim()}
                          variant="outline"
                          className="h-11 px-4"
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
                      <Label htmlFor="github-token" className="text-sm font-medium text-gray-700">
                        Token de Acesso <span className="text-gray-500 font-normal">(Opcional)</span>
                      </Label>
                      <Input
                        id="github-token"
                        name="github-access-token"
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxx"
                        autoComplete="new-password"
                        data-form-type="other"
                        className="mt-1.5 h-11"
                      />
                      <p className="text-xs text-gray-500 mt-2 flex items-start gap-1.5">
                        <svg className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>Necessário apenas para repositórios privados</span>
                      </p>
                    </div>

                    {githubRepoInfo && (
                      <div className="rounded-lg bg-green-50 p-4 border-2 border-green-200">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
                              Repositório encontrado!
                              {githubRepoInfo.isPrivate && (
                                <Badge variant="secondary" className="text-xs bg-gray-800 text-white">
                                  <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                  Privado
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              Clique em "Importar Projeto" para buscar os arquivos e criar os cards automaticamente.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card: Opções de Importação */}
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    Configurações de Importação
                  </h3>

                  <div className="flex items-start gap-3 rounded-lg border-2 border-indigo-100 bg-indigo-50/50 p-4">
                    <Checkbox
                      id="use-ai-import"
                      checked={useAiImport}
                      onCheckedChange={(checked) => setUseAiImport(checked === true)}
                      disabled={importingGithub}
                      className="mt-1"
                    />
                    <div className="space-y-1 flex-1">
                      <label
                        htmlFor="use-ai-import"
                        className="text-sm font-semibold leading-none text-indigo-900 cursor-pointer flex items-center gap-2"
                      >
                        <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Usar IA para organizar os cards
                      </label>
                      <p className="text-xs text-indigo-700 leading-relaxed">
                        A IA analisa o código e organiza automaticamente os cards de forma inteligente, tornando-os mais descritivos e alinhados com boas práticas.
                        Quando desmarcado, usa apenas análise heurística básica.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card: Informações do Projeto */}
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Detalhes do Projeto
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="github-name" className="text-sm font-medium text-gray-700">
                        Nome do Projeto *
                      </Label>
                      <Input
                        id="github-name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Nome será preenchido automaticamente"
                        className="mt-1.5 h-11"
                      />
                    </div>

                    <div>
                      <Label htmlFor="github-description" className="text-sm font-medium text-gray-700">
                        Descrição
                      </Label>
                      <Textarea
                        id="github-description"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="Descrição será preenchida automaticamente"
                        rows={4}
                        className="mt-1.5 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Card: Colaboradores */}
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    Colaboradores <span className="text-sm font-normal text-gray-500">(Opcional)</span>
                  </h3>

                  <div>
                    <Label htmlFor="member-email-github" className="text-sm font-medium text-gray-700">
                      Email do membro
                    </Label>
                    <Input
                      id="member-email-github"
                      value={memberEmailToAdd}
                      onChange={(e) => setMemberEmailToAdd(e.target.value)}
                      placeholder="usuario@empresa.com"
                      disabled={importingGithub}
                      className="mt-1.5 h-11"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-start gap-1.5">
                      <svg className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>Se o email existir no sistema, o usuário será adicionado ao projeto automaticamente.</span>
                    </p>
                  </div>
                </div>

                {/* Status de importação */}
                {importingGithub && importStatus && (
                  <div className="rounded-lg bg-blue-50 p-4 border-2 border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900">{importStatus}</p>
                        <p className="text-xs text-blue-700 mt-1.5 flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
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
            <DialogFooter className="flex-shrink-0 border-t pt-6 mt-2 bg-white">
              <Button
                variant="outline"
                onClick={resetFormAndClose}
                disabled={creating || importingGithub}
                className="h-11 px-6"
              >
                Cancelar
              </Button>

              {createDialogTab === "manual" ? (
                <Button
                  onClick={handleCreateProject}
                  disabled={creating || !newProjectName.trim()}
                  className="h-11 px-6"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Projeto
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleImportFromGithub}
                  disabled={importingGithub || !githubUrl.trim() || !newProjectName.trim()}
                  className="h-11 px-6"
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
                    <>
                      {hasRunningImport(project.id) ? (
                        <div
                          className="ml-2 flex items-center gap-2"
                          title={defaultMessage(getImportInfo(project.id)?.step ?? '')}
                        >
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          <span className="text-xs text-gray-600">
                            {getImportInfo(project.id)?.progress}%
                          </span>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => openDeleteDialog(project, e)}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </>
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
