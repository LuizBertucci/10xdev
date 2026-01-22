import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Github, Loader2, Plus, Search } from "lucide-react"
import { projectService, type GithubRepoInfo } from "@/services"
import { toast } from "sonner"
import { IMPORT_JOB_LS_KEY } from "@/lib/importJobUtils"

interface PlatformState {
  setActiveTab?: (tab: string) => void
}

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platformState?: PlatformState
  onSaved: () => void
}

export function ProjectForm({ open, onOpenChange, platformState, onSaved }: ProjectFormProps) {
  const router = useRouter()
  const [leftTab, setLeftTab] = useState<"create" | "import">("create")
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [creating, setCreating] = useState(false)

  // GitHub integration states
  const [githubUrl, setGithubUrl] = useState("")
  const [githubToken, setGithubToken] = useState("")
  const [loadingGithub, setLoadingGithub] = useState(false)
  const [importingGithub, setImportingGithub] = useState(false)
  const [githubRepoInfo, setGithubRepoInfo] = useState<GithubRepoInfo | null>(null)
  const [memberEmailToAdd, setMemberEmailToAdd] = useState("")
  const hasGithubUrl = githubUrl.trim().length > 0

  const isValidGithubUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      if (urlObj.hostname !== "github.com") return false
      const parts = urlObj.pathname.split("/").filter(Boolean)
      return parts.length >= 2
    } catch {
      return false
    }
  }

  const resetForm = () => {
    setLeftTab("create")
    setNewProjectName("")
    setNewProjectDescription("")
    setGithubUrl("")
    setGithubToken("")
    setGithubRepoInfo(null)
    setMemberEmailToAdd("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Nome do projeto é obrigatório")
      return
    }

    try {
      setCreating(true)
      const response = await projectService.create({
        name: newProjectName,
        description: newProjectDescription || undefined
      })

      if (!response) {
        toast.error("Nenhuma resposta do servidor ao criar o projeto.")
        return
      }

      if (response.success && response.data) {
        toast.success("Projeto criado com sucesso!")
        onSaved()
        handleOpenChange(false)
      } else {
        toast.error(response.error || "Erro ao criar projeto")
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar projeto")
    } finally {
      setCreating(false)
    }
  }

  const handleAnalyzeGithub = async (showToasts = true) => {
    if (!githubUrl.trim()) {
      if (showToasts) toast.error("URL do GitHub é obrigatória")
      return
    }
    if (!isValidGithubUrl(githubUrl)) {
      if (showToasts) toast.error("URL inválida. Use: https://github.com/usuario/repositorio")
      return
    }

    try {
      setLoadingGithub(true)
      const response = await projectService.getGithubInfo({ url: githubUrl, token: githubToken || undefined })
      if (response?.success && response.data) {
        setGithubRepoInfo(response.data)
        setNewProjectName(response.data.name)
        setNewProjectDescription(response.data.description || "")
        if (showToasts) toast.success(`Repositório${response.data.isPrivate ? " privado" : ""} encontrado!`)
      } else if (showToasts) {
        toast.error(response?.error || "Erro ao buscar informações do repositório")
      }
    } catch (error: any) {
      if (showToasts) toast.error(error?.message || "Erro ao buscar informações do repositório")
    } finally {
      setLoadingGithub(false)
    }
  }

  const handleImportFromGithub = async () => {
    if (!githubUrl.trim()) { toast.error("URL do GitHub é obrigatória"); return }
    if (!newProjectName.trim()) { toast.error("Nome do projeto é obrigatório"); return }

    try {
      setImportingGithub(true)
      const response = await projectService.importFromGithub({
        url: githubUrl,
        token: githubToken || undefined,
        name: newProjectName,
        description: newProjectDescription || undefined,
        useAi: true,
        addMemberEmail: memberEmailToAdd.trim() || undefined
      })

      if (response?.success && response.data) {
        const { project, jobId } = response.data
        toast.success("Importação iniciada! Abrindo o projeto...")
        try {
          localStorage.setItem(IMPORT_JOB_LS_KEY, JSON.stringify({ jobId, projectId: project.id, createdAt: new Date().toISOString() }))
        } catch { /* ignore */ }

        if (platformState?.setActiveTab) {
          const params = new URLSearchParams()
          params.set("tab", "projects")
          params.set("id", project.id)
          params.set("jobId", jobId)
          router.push(`/?${params.toString()}`)
        } else {
          router.push(`/projects/${project.id}?jobId=${encodeURIComponent(jobId)}`)
        }

        onSaved()
        handleOpenChange(false)
      } else {
        toast.error(response?.error || "Erro ao importar projeto")
      }
    } catch (error: any) {
      toast.error(error?.message || "Erro ao importar projeto do GitHub")
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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:gap-6 md:items-stretch">
              <div className="flex flex-col gap-3 md:w-1/2">
                <Tabs value={leftTab} onValueChange={(value) => setLeftTab(value as "create" | "import")}>
                  <TabsList className="grid w-full grid-cols-2 mb-4 h-9">
                    <TabsTrigger value="create" className="text-xs font-semibold">
                      Criar
                    </TabsTrigger>
                    <TabsTrigger value="import" className="text-xs font-semibold">
                      Importar
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="space-y-3 mt-0 min-h-[240px]">
                    <div>
                      <Label htmlFor="name" className="block text-xs font-medium text-gray-600 mb-1.5">Nome do Projeto *</Label>
                      <Input id="name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Ex: E-commerce Completo" className="h-9 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-400 text-sm" />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <Label htmlFor="description" className="block text-xs font-medium text-gray-600 mb-1.5">Descrição</Label>
                      <Textarea id="description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} placeholder="Descreva o objetivo do projeto..." rows={4} className="flex-1 min-h-[100px] bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-400 text-xs resize-none" />
                    </div>
                  </TabsContent>

                  <TabsContent value="import" className="space-y-3 mt-0 min-h-[240px]">
                    <div className="space-y-3 border border-gray-200 rounded-lg p-3 bg-white">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        Repositório GitHub
                      </h3>
                      <div>
                        <Label htmlFor="github-url" className="block text-xs font-medium text-gray-600 mb-1.5">URL do Repositório *</Label>
                        <div className="flex gap-2">
                          <Input id="github-url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/usuario/repositorio" className="flex-1 h-9 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-400 text-sm" autoComplete="off" />
                          <Button onClick={() => handleAnalyzeGithub(true)} disabled={loadingGithub || !githubUrl.trim()} variant="outline" className="h-9 px-3">
                            {loadingGithub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="github-token" className="block text-xs font-medium text-gray-600 mb-1.5">Token de Acesso (opcional)</Label>
                        <Input id="github-token" type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" className="h-9 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-400 text-sm" autoComplete="new-password" />
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

                  </TabsContent>
                </Tabs>
              </div>

              <div className="md:w-1/2 md:flex md:flex-col">
                <div className="space-y-3 border border-blue-200 rounded-lg p-3 bg-white md:flex-1 md:flex md:flex-col">
                  <div>
                    <Label htmlFor="member-email" className="block text-xs font-medium text-gray-600 mb-1.5">Email do membro (opcional)</Label>
                    <Input id="member-email" value={memberEmailToAdd} onChange={(e) => setMemberEmailToAdd(e.target.value)} placeholder="usuario@empresa.com" className="h-9 bg-white border-blue-300 text-sm shadow-sm" />
                    <p className="text-xs text-gray-500 mt-2">Se o email existir no sistema, o usuário será adicionado ao projeto.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-6 mt-2 bg-white">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={creating || importingGithub} className="h-11 px-6">Cancelar</Button>
          <Button
            onClick={leftTab === "import" ? handleImportFromGithub : handleCreateProject}
            disabled={
              creating ||
              importingGithub ||
              !newProjectName.trim() ||
              (leftTab === "import" && !isValidGithubUrl(githubUrl))
            }
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
