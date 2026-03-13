import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Github, Loader2, Plus, CheckCircle, Unplug } from "lucide-react"
import { projectService, type User, type GithubAppRepo } from "@/services"
import { Sharing } from "@/components/Sharing"
import { toast } from "sonner"
import { IMPORT_JOB_LS_KEY, IMPORT_MODAL_OPEN_KEY, IMPORT_MODAL_CHANGE_EVENT } from "@/lib/importJobUtils"
import {
  beginGithubAppInstallation,
  consumeGithubAppInstallation,
  getStoredGithubInstallationId,
} from "@/lib/githubInstallFlow"

const INPUT_CLASS = "h-9 bg-gray-50 border-gray-200 outline-none focus:outline-none focus-visible:outline-none focus:border-gray-200 focus-visible:border-gray-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none focus-visible:shadow-none text-sm"


interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function ProjectForm({ open, onOpenChange, onSaved }: ProjectFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [leftTab, setLeftTab] = useState<"create" | "import">("create")
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [creating, setCreating] = useState(false)

  // GitHub App install states
  const [isGithubConnected, setIsGithubConnected] = useState(false)
  const [installationId, setInstallationId] = useState<number | null>(null)
  const [availableRepos, setAvailableRepos] = useState<GithubAppRepo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<GithubAppRepo | null>(null)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [importingGithub, setImportingGithub] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<User[]>([])

  const clearGithubSyncQueryParams = () => {
    if (!searchParams) return

    const params = new URLSearchParams(searchParams.toString())
    const keysToDelete = [
      'github_sync',
      'installation_id',
      'state',
      'open_project_form',
      'github_sync_error'
    ]

    let changed = false
    keysToDelete.forEach((key) => {
      if (params.has(key)) {
        params.delete(key)
        changed = true
      }
    })

    if (!changed) return

    const newQuery = params.toString()
    router.replace(newQuery ? `?${newQuery}` : '/projects')
  }

  // Hidrata conexão GitHub (retorno da instalação ou sessão existente)
  useEffect(() => {
    if (!open) return

    const githubSyncError = searchParams?.get('github_sync_error')
    if (githubSyncError) {
      setLeftTab('import')
      toast.error(githubSyncError)
      clearGithubSyncQueryParams()
      return
    }

    const shouldOpenImportTab =
      searchParams?.get('open_project_form') === 'true' ||
      searchParams?.get('github_sync') === 'true'
    if (shouldOpenImportTab) {
      setLeftTab('import')
    }

    const installationIdParam = searchParams?.get('installation_id')
    const stateParam = searchParams?.get('state')

    let rawId: string | null = null
    if (installationIdParam) {
      const callbackResult = consumeGithubAppInstallation({
        installationId: installationIdParam,
        state: stateParam
      })

      if (!callbackResult.success) {
        toast.error(callbackResult.error)
        clearGithubSyncQueryParams()
        return
      }

      rawId = installationIdParam
      clearGithubSyncQueryParams()
    } else {
      rawId = getStoredGithubInstallationId()
    }

    if (!rawId) return

    const id = Number(rawId)
    if (!isNaN(id) && id > 0) {
      setLeftTab('import')
      setInstallationId(id)
      setIsGithubConnected(true)
      loadAvailableRepos(id)
    }
  }, [open, searchParams, router])

  // Load available repos from GitHub App
  const loadAvailableRepos = async (installId: number) => {
    try {
      setLoadingRepos(true)
      const response = await projectService.listGithubRepos(installId)
      if (response?.success && response.data) {
        setAvailableRepos(response.data)
      }
    } catch (error) {
      console.error('Error loading repos:', error)
      toast.error('Erro ao carregar repositórios')
    } finally {
      setLoadingRepos(false)
    }
  }

  // Handle GitHub App install
  const handleConnectGithub = () => {
    try {
      const installUrl = beginGithubAppInstallation()
      window.location.href = installUrl
    } catch (error) {
      console.error('[GitHub App] Falha ao iniciar instalação:', error)
      setStorageError(true)
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar o fluxo do GitHub.')
    }
  }

  // Handle repo selection
  const handleSelectRepo = (repo: GithubAppRepo) => {
    setSelectedRepo(repo)
  }

  const handleDisconnectGithub = () => {
    setIsGithubConnected(false)
    setInstallationId(null)
    setAvailableRepos([])
    setSelectedRepo(null)
    setLoadingRepos(false)

    try {
      sessionStorage.removeItem('github_sync_installation_id')
      localStorage.removeItem('github_sync_installation_id')
    } catch {
      // ignore storage errors
    }

    toast.success('Conexão do GitHub removida deste formulário')
  }

  const resetForm = () => {
    setLeftTab("create")
    setNewProjectName("")
    setNewProjectDescription("")
    setSelectedRepo(null)
    setStorageError(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) resetForm()
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
        description: newProjectDescription || undefined
      })

      if (!response) {
        toast.error('Nenhuma resposta do servidor ao criar o projeto.')
        return
      }

      if (response.success && response.data) {
        if (selectedMembers.length > 0) {
          try {
            await projectService.shareProject(response.data.id, {
              userIds: selectedMembers.map((m) => m.id),
              emails: selectedMembers.map((m) => m.email)
            })
          } catch {
            toast.warning('Projeto criado, mas erro ao compartilhar com membros.')
          }
        }
        toast.success('Projeto criado com sucesso!')
        onSaved()
        handleOpenChange(false)
      } else {
        toast.error(response.error || 'Erro ao criar projeto')
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar projeto')
    } finally {
      setCreating(false)
    }
  }

  const handleImportFromGithub = async () => {
    if (!selectedRepo) {
      toast.error('Selecione um repositório')
      return
    }

    try {
      setImportingGithub(true)
      const url = `https://github.com/${selectedRepo.owner.login}/${selectedRepo.name}`
      
      const response = await projectService.importFromGithub({
        url,
        useAi: true,
        installationId: installationId || undefined
      })

      if (response?.success && response.data) {
        const { project, jobId } = response.data
        
        if (selectedMembers.length > 0) {
          try {
            await projectService.shareProject(project.id, {
              userIds: selectedMembers.map((m) => m.id),
              emails: selectedMembers.map((m) => m.email)
            })
          } catch {
            toast.warning('Importação iniciada, mas erro ao compartilhar com membros.')
          }
        }
        
        toast.success("Importação iniciada! Abrindo o projeto...")
        
        try {
          localStorage.setItem(IMPORT_JOB_LS_KEY, JSON.stringify({ jobId, projectId: project.id, createdAt: new Date().toISOString() }))
          localStorage.setItem(IMPORT_MODAL_OPEN_KEY, 'true')
          window.dispatchEvent(new CustomEvent(IMPORT_MODAL_CHANGE_EVENT))
        } catch { /* ignore */ }

        router.push(`/projects/${project.id}?jobId=${encodeURIComponent(jobId)}`)

        onSaved()
        handleOpenChange(false)
      } else {
        toast.error(response?.error || "Erro ao importar projeto")
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar projeto do GitHub")
    } finally {
      setImportingGithub(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
          <DialogDescription>
            Crie um projeto do zero ou importe de um repositório GitHub
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden pr-1">
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 md:h-[60vh] overflow-y-auto md:overflow-hidden">
            <div className="flex flex-col gap-4 md:flex-row md:gap-6 md:h-full md:items-stretch">
              <div className="flex flex-col gap-3 md:w-1/2 md:h-full md:min-h-0 md:overflow-y-auto md:pr-2">
                <Tabs value={leftTab} onValueChange={(value) => setLeftTab(value as "create" | "import")}>
                  <TabsList className="grid w-full grid-cols-2 mb-4 h-9">
                    <TabsTrigger value="create" className="text-xs font-semibold">Criar</TabsTrigger>
                    <TabsTrigger value="import" className="text-xs font-semibold">Importar</TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="space-y-3 mt-0 min-h-[240px]">
                    <div>
                      <Label htmlFor="name" className="block text-xs font-medium text-gray-600 mb-1.5">Nome do Projeto *</Label>
                      <Input id="name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Ex: E-commerce Completo" className={INPUT_CLASS} />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <Label htmlFor="description" className="block text-xs font-medium text-gray-600 mb-1.5">Descrição</Label>
                      <Textarea id="description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} placeholder="Descreva o objetivo do projeto..." rows={4} className="flex-1 min-h-[100px] bg-gray-50 border-gray-200 outline-none focus:outline-none focus-visible:outline-none focus:border-gray-200 focus-visible:border-gray-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none focus-visible:shadow-none text-xs resize-none" />
                    </div>
                  </TabsContent>

                  <TabsContent value="import" className="space-y-3 mt-0 min-h-[240px]">
                    <div className="space-y-3 border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Github className="h-4 w-4" />
                          Repositório GitHub
                        </h3>
                        {isGithubConnected && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleDisconnectGithub}
                            className="ml-auto h-7 w-7 shrink-0 rounded-md border border-black bg-white text-black hover:bg-gray-100 hover:text-black"
                            title="Desconectar GitHub"
                            aria-label="Desconectar GitHub"
                          >
                            <Unplug className="h-4 w-4 text-black" />
                          </Button>
                        )}
                      </div>

                      {!isGithubConnected ? (
                        <div className="text-center py-6">
                          <Button
                            onClick={handleConnectGithub}
                            disabled={storageError}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            <Github className="h-4 w-4 mr-2" />
                            Conectar GitHub
                          </Button>
                          <p className="text-xs text-gray-500 mt-2">
                            {storageError
                              ? 'Armazenamento de sessão indisponível. Tente em outro navegador.'
                              : 'Você será redirecionado para autorizar o acesso'}
                          </p>
                        </div>
                      ) : loadingRepos ? (
                        <div className="text-center py-6">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                          <p className="text-xs text-gray-500 mt-2">Carregando repositórios...</p>
                        </div>
                      ) : (
                        <>
                          <div>
                            <Label className="block text-xs font-medium text-gray-600 mb-1.5">
                              Selecione um Repositório *
                            </Label>
                            <Select
                              value={selectedRepo?.full_name ?? ""}
                              onValueChange={(value) => {
                                const repo = availableRepos.find(r => r.full_name === value)
                                if (repo) handleSelectRepo(repo)
                              }}
                              disabled={loadingRepos}
                            >
                              <SelectTrigger className="w-full text-sm border-gray-200 bg-white">
                                <SelectValue placeholder="Selecione um repositório..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableRepos.length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-gray-500">Nenhum repositório encontrado</div>
                                ) : (
                                  availableRepos.map((repo) => (
                                    <SelectItem key={repo.full_name} value={repo.full_name}>
                                      <span className="flex items-center gap-2">
                                        <Github className="h-3 w-3 text-gray-400" />
                                        {repo.full_name}
                                        {repo.private && (
                                          <Badge variant="secondary" className="text-xs ml-1">Privado</Badge>
                                        )}
                                      </span>
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedRepo && (
                            <div className="rounded-lg bg-green-50 p-4 border-2 border-green-200">
                              <div className="text-sm font-semibold text-green-900 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Repositório selecionado!
                              </div>
                              <p className="text-xs text-green-700 mt-1">Clique em "Importar Projeto" para criar os cards automaticamente.</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="md:w-1/2 md:flex md:flex-col md:h-full md:min-h-0">
                <div className="space-y-3 border border-blue-200 rounded-lg p-3 bg-white md:h-full md:min-h-0 md:flex-1 md:flex md:flex-col">
                  <Sharing selectedUsers={selectedMembers} onChange={setSelectedMembers} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-3 mt-0 bg-white">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={creating || importingGithub} className="h-11 px-6">Cancelar</Button>
          <Button
            onClick={leftTab === "import" ? handleImportFromGithub : handleCreateProject}
            disabled={creating || importingGithub || (leftTab === "create" && !newProjectName.trim()) || (leftTab === "import" && !selectedRepo)}
            className="h-11 px-6"
          >
            {creating || importingGithub ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {leftTab === "import" ? "Importando Projeto..." : "Criando Projeto..."}
              </>
            ) : (
              <>
                {leftTab === "import" ? <Github className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {leftTab === "import" ? "Importar Projeto" : "Criar Projeto"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
