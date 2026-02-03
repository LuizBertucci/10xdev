import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AIInstructions } from "@/components/AIInstructions"
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
import { Github, Loader2, Plus, Search, ExternalLink, AlertCircle, CheckCircle } from "lucide-react"
import { projectService, type GithubRepoInfo, type User } from "@/services"
import { Sharing } from "@/components/Sharing"
import { toast } from "sonner"
import { IMPORT_JOB_LS_KEY } from "@/lib/importJobUtils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const IMPORT_INSTRUCTIONS = [
  'Você é um arquiteto de software especializado em organizar código.',
  '',
  '## Tarefa',
  'Organize os arquivos em "cards" por funcionalidade de negócio.',
  '',
  '## Regras',
  '- 1 card = 1 feature coesa (ex: Autenticação, Usuários, Pagamentos)',
  '- Agrupe arquivos relacionados mesmo de camadas diferentes',
  '- Cada card tem múltiplas "screens" organizadas por camada técnica',
  '',
  '## Formato de Saída',
  '- title: Nome descritivo em português (ex: "Sistema de Autenticação")',
  '- description: O que a funcionalidade FAZ (não liste arquivos)',
  '- screens[].name: Nome da camada (ex: "Backend - Controller")',
  '- screens[].files: Paths EXATOS dos arquivos da lista fornecida',
  '',
  '## Exemplos de Bons Títulos',
  '- "Sistema de Autenticação" (não "Auth")',
  '- "Gerenciamento de Usuários" (não "User")',
  '- "Processamento de Pagamentos" (não "Payment")',
  '',
  '## Saída',
  'Retorne APENAS JSON válido com a chave "cards".'
].join('\n')

const IMPORT_INSTRUCTIONS_ROWS = IMPORT_INSTRUCTIONS.split('\n').length + 14
const IMPORT_INSTRUCTIONS_LS_KEY = "project-import-instructions"

/** Classe CSS compartilhada para inputs padronizados. */
const INPUT_CLASS = "h-9 bg-gray-50 border-gray-200 outline-none focus:outline-none focus-visible:outline-none focus:border-gray-200 focus-visible:border-gray-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none focus-visible:shadow-none text-sm"

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
  const [selectedMembers, setSelectedMembers] = useState<User[]>([])
  const [importInstructions, setImportInstructions] = useState(IMPORT_INSTRUCTIONS)
  const [showLoginWarning, setShowLoginWarning] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'valid' | 'invalid' | 'checking'>('idle')
  const [urlStatus, setUrlStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [showTokenField, setShowTokenField] = useState(false)
  const [possiblePrivateRepo, setPossiblePrivateRepo] = useState(false)
  const hasGithubUrl = githubUrl.trim().length > 0

  useEffect(() => {
    try {
      const stored = localStorage.getItem(IMPORT_INSTRUCTIONS_LS_KEY)
      if (stored) setImportInstructions(stored)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(IMPORT_INSTRUCTIONS_LS_KEY, importInstructions)
    } catch { /* ignore */ }
  }, [importInstructions])

  // Validação da URL do GitHub
  useEffect(() => {
    if (!githubUrl.trim()) {
      setUrlStatus('idle')
      return
    }

    const timer = setTimeout(() => {
      if (isValidGithubUrl(githubUrl)) {
        setUrlStatus('valid')
      } else {
        setUrlStatus('invalid')
      }
    }, 500) // Debounce de 500ms

    return () => clearTimeout(timer)
  }, [githubUrl])

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
    setSelectedMembers([])
    setImportInstructions(IMPORT_INSTRUCTIONS)
    setShowTokenField(false)
    setPossiblePrivateRepo(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) resetForm()
  }

  // Capturar token temporário do sessionStorage quando abrir o dialog
  useEffect(() => {
    if (open) {
      try {
        const tempToken = sessionStorage.getItem('github_token_temp')
        if (tempToken) {
          setGithubToken(tempToken)
          sessionStorage.removeItem('github_token_temp')
        }
      } catch { /* ignore */ }
    }
  }, [open])

  // Validar token em tempo real (com debounce)
  useEffect(() => {
    if (!githubToken.trim()) {
      setTokenStatus('idle')
      return
    }

    const timer = setTimeout(async () => {
      setTokenStatus('checking')
      try {
        const response = await projectService.validateGithubToken(githubToken)
        if (response?.success && response.data?.valid) {
          setTokenStatus('valid')
          setPossiblePrivateRepo(false)
          // Token validado: buscar metadata do repo automaticamente (preenche nome/descricao)
          if (githubUrl.trim() && isValidGithubUrl(githubUrl)) {
            handleAnalyzeGithub(false)
          }
        } else {
          setTokenStatus('invalid')
        }
      } catch {
        setTokenStatus('invalid')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [githubToken, githubUrl, isValidGithubUrl, handleAnalyzeGithub])

  // Auto buscar info do repo quando colar URL válida
  useEffect(() => {
    if (!githubUrl.trim()) {
      setGithubRepoInfo(null)
      setPossiblePrivateRepo(false)
      setShowTokenField(false)
      return
    }
    if (!isValidGithubUrl(githubUrl)) {
      setPossiblePrivateRepo(false)
      return
    }

    // Se já sabemos que é privado e não tem token, não tentar buscar automaticamente
    if (possiblePrivateRepo && !githubToken) return

    const timeoutId = setTimeout(() => handleAnalyzeGithub(false), 500)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubUrl, githubToken, possiblePrivateRepo])

  /** Compartilha projeto com membros selecionados. Extraído para evitar duplicação. */
  const shareWithMembers = async (projectId: string, isImport = false) => {
    if (selectedMembers.length === 0) return
    try {
      await projectService.shareProject(projectId, {
        userIds: selectedMembers.map((m) => m.id),
        emails: selectedMembers.map((m) => m.email)
      })
    } catch {
      toast.warning(`${isImport ? 'Importação iniciada' : 'Projeto criado'}, mas erro ao compartilhar com membros.`)
    }
  }

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
        await shareWithMembers(response.data.id, false)
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

  const handleAnalyzeGithub = useCallback(async (showToasts = true) => {
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
      const response = showToasts 
        ? await projectService.getGithubInfo({ url: githubUrl, token: githubToken || undefined })
        : await projectService.getGithubInfo({ url: githubUrl, token: githubToken || undefined }, true)
      
      if (response?.success && response.data) {
        setGithubRepoInfo(response.data)
        setNewProjectName(response.data.name)
        setNewProjectDescription(response.data.description || "")
        setPossiblePrivateRepo(false)
        if (showToasts) toast.success(`Repositório${response.data.isPrivate ? " privado" : ""} encontrado!`)
      } else if (!response?.success) {
        if (!githubToken) {
          setShowTokenField(true)
          setPossiblePrivateRepo(true)
        }
        if (showToasts) {
          toast.error(githubToken
            ? "Token sem permissão para este repositório"
            : (response?.error || "Erro ao buscar informações do repositório"))
        }
      }
    } catch (error: any) {
      const statusCode = error?.statusCode || error?.response?.status
      const isAuthError = statusCode === 401 || statusCode === 403 || statusCode === 404

      if (isAuthError && !githubToken) {
        setShowTokenField(true)
        setPossiblePrivateRepo(true)
        if (showToasts) toast.info("Repositório privado detectado. Adicione um token de acesso.")
      } else if (isAuthError && githubToken) {
        if (showToasts) toast.error("Token sem permissão para este repositório")
      } else if (showToasts) {
        toast.error(error?.message || "Erro ao buscar informações do repositório")
      }
    } finally {
      setLoadingGithub(false)
    }
  }, [githubUrl, githubToken])

  const handleGenerateGithubToken = () => {
    if (!githubUrl.trim()) {
      toast.error("Cole a URL do repositório primeiro")
      return
    }
    
    try {
      sessionStorage.setItem('pending_github_import_url', githubUrl)
    } catch { /* ignore */ }

    const tokenUrl = new URL('https://github.com/settings/tokens/new')
    tokenUrl.searchParams.set('scopes', 'repo')
    tokenUrl.searchParams.set('description', '10xDev - Importação de Projetos')
    window.open(tokenUrl.toString(), '_blank')
  }

  const handleShowTokenFieldAndOpenGithub = () => {
    setShowTokenField(true)
    handleGenerateGithubToken()
    setTimeout(() => {
      const tokenInput = document.getElementById('github-token')
      if (tokenInput) tokenInput.focus()
    }, 100)
  }

  const handleImportFromGithub = async () => {
    if (!githubUrl.trim()) { toast.error("URL do GitHub é obrigatória"); return }
    if (!newProjectName.trim()) { toast.error("Nome do projeto é obrigatório"); return }

    if (githubRepoInfo?.isPrivate && !githubToken) {
      setShowLoginWarning(true)
      return
    }

    try {
      setImportingGithub(true)
      const response = await projectService.importFromGithub({
        url: githubUrl,
        token: githubToken || undefined,
        name: newProjectName,
        description: newProjectDescription || undefined,
        useAi: true
      })

      if (response?.success && response.data) {
        const { project, jobId } = response.data
        await shareWithMembers(project.id, true)
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
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        Repositório GitHub
                      </h3>
                      <div>
                        <Label htmlFor="github-url" className="block text-xs font-medium text-gray-600 mb-1.5">URL do Repositório *</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="github-url"
                              name="github-repo-url"
                              value={githubUrl}
                              onChange={(e) => setGithubUrl(e.target.value)}
                              placeholder="https://github.com/usuario/repositorio"
                              className={`pr-10 ${INPUT_CLASS} ${urlStatus === 'valid' ? 'border-green-500' : urlStatus === 'invalid' ? 'border-red-500' : ''}`}
                              autoComplete="off"
                              data-form-type="other"
                              data-lpignore="true"
                            />
                            {urlStatus === 'valid' && <CheckCircle className="h-4 w-4 text-green-600 absolute right-3 top-2.5" />}
                            {urlStatus === 'invalid' && <AlertCircle className="h-4 w-4 text-red-600 absolute right-3 top-2.5" />}
                          </div>
                          <Button onClick={() => handleAnalyzeGithub(true)} disabled={loadingGithub || !githubUrl.trim() || urlStatus === 'invalid'} variant="outline" className="h-9 px-3">
                            {loadingGithub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>
                        {urlStatus === 'invalid' && <p className="text-xs text-red-600 mt-1">❌ URL inválida. Use: https://github.com/usuario/repositorio</p>}
                        {(githubRepoInfo?.isPrivate || possiblePrivateRepo) && !githubToken && (
                          <button onClick={handleShowTokenFieldAndOpenGithub} className="mt-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Repositório privado, obter token de acesso →
                          </button>
                        )}
                      </div>

                      {(showTokenField || githubToken || ((githubRepoInfo?.isPrivate || possiblePrivateRepo) && !githubToken)) && (
                        <div>
                          <Label htmlFor="github-token" className="block text-xs font-medium text-gray-600 mb-1.5">
                            {githubToken ? "Token de Acesso ✓" : "Token de Acesso"}
                          </Label>
                          <div className="relative">
                            <Input id="github-token" name="github-access-token" type="text" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="cole seu token aqui" className={`${INPUT_CLASS} pr-10 [-webkit-text-security:disc] ${tokenStatus === 'valid' ? 'border-green-500' : tokenStatus === 'invalid' ? 'border-red-500' : ''}`} autoComplete="off" data-form-type="other" data-lpignore="true" />
                            {tokenStatus === 'checking' && <Loader2 className="h-4 w-4 text-gray-400 animate-spin absolute right-3 top-2.5" />}
                            {tokenStatus === 'valid' && <CheckCircle className="h-4 w-4 text-green-600 absolute right-3 top-2.5" />}
                            {tokenStatus === 'invalid' && <AlertCircle className="h-4 w-4 text-red-600 absolute right-3 top-2.5" />}
                          </div>
                          {tokenStatus === 'valid' && <p className="text-xs text-green-600 mt-1">✅ Token válido</p>}
                          {tokenStatus === 'invalid' && <p className="text-xs text-red-600 mt-1">❌ Token inválido ou expirado</p>}
                          {(githubRepoInfo?.isPrivate || possiblePrivateRepo) && tokenStatus !== 'valid' && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                              <p className="font-medium mb-1">🔒 Repositório privado detectado</p>
                              <p className="text-amber-800">
                                Crie um token em{' '}
                                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">
                                  github.com/settings/tokens
                                </a>
                                {' '}e marque o escopo <span className="font-mono bg-amber-100 px-1 rounded">repo</span> para acessar repositórios privados.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <Label htmlFor="import-project-name" className="block text-xs font-medium text-gray-600 mb-1.5">Nome do Projeto *</Label>
                        <Input id="import-project-name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Ex: E-commerce Completo" className={INPUT_CLASS} />
                        <p className="text-xs text-gray-500 mt-2">Preenchido automaticamente com o nome do repo</p>
                      </div>
                      <div>
                        <Label htmlFor="import-project-description" className="block text-xs font-medium text-gray-600 mb-1.5">Descrição</Label>
                        <Textarea id="import-project-description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} placeholder="Descreva o objetivo do projeto..." rows={2} className="bg-gray-50 border-gray-200 outline-none focus:outline-none focus-visible:outline-none focus:border-gray-200 focus-visible:border-gray-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none focus-visible:shadow-none text-xs resize-none" />
                      </div>
                      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                        <AIInstructions value={importInstructions} onChange={setImportInstructions} rows={IMPORT_INSTRUCTIONS_ROWS} label="Instruções para a IA" />
                      </div>

                      {githubRepoInfo && (
                        <div className="rounded-lg bg-green-50 p-4 border-2 border-green-200">
                          <div className="text-sm font-semibold text-green-900 flex items-center gap-2">
                            Repositório encontrado!
                            {githubRepoInfo.isPrivate && <Badge variant="secondary" className="text-xs bg-gray-800 text-white">Privado</Badge>}
                          </div>
                          <p className="text-xs text-green-700 mt-1">Clique em "Importar Projeto" para criar os cards automaticamente.</p>
                        </div>
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
            disabled={creating || importingGithub || !newProjectName.trim() || (leftTab === "import" && !isValidGithubUrl(githubUrl))}
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

        <AlertDialog open={showLoginWarning} onOpenChange={setShowLoginWarning}>
          <AlertDialogContent>
            <AlertDialogTitle>🔒 Repositório Privado</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>Este repositório é privado. Você precisa de um token de acesso para importá-lo.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-900 font-medium">Como funciona:</p>
                  <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
                    <li>Clique em "Gerar Token"</li>
                    <li>Você será levado para o GitHub</li>
                    <li>O token será gerado automaticamente</li>
                    <li>Você voltará e poderá importar</li>
                  </ol>
                </div>
              </div>
            </AlertDialogDescription>
            <div className="flex gap-3">
              <AlertDialogCancel className="h-9">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowLoginWarning(false); handleGenerateGithubToken() }} className="h-9 bg-blue-600 hover:bg-blue-700">
                Gerar Token →
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
