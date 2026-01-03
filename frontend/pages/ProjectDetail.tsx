"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, Trash2, ChevronUp, ChevronDown, Check, User as UserIcon, Pencil, Loader2, MoreVertical, ChevronRight, Info, CheckCircle2, AlertTriangle, Bot } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { projectService, type Project, ProjectMemberRole } from "@/services"
import { cardFeatureService, type CardFeature } from "@/services"
import { userService, type User } from "@/services/userService"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import { usePlatform } from "@/hooks/use-platform"

interface PlatformState {
  setActiveTab?: (tab: string) => void
}

interface ProjectDetailProps {
  platformState?: PlatformState
}

export default function ProjectDetail({ platformState }: ProjectDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams?.get('id') || null

  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [cardFeatures, setCardFeatures] = useState<CardFeature[]>([])
  const [availableCards, setAvailableCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingCards, setLoadingCards] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)

  // User Search State
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [userSearchResults, setUserSearchResults] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const grokEnabled = process.env.NEXT_PUBLIC_GROK_ENABLED === "true"
  const [status, setStatus] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null)
  
  // Import job state
  const supabase = useMemo(() => { try { return createClient() } catch { return null } }, [])
  const [importJob, setImportJob] = useState<{
    id: string
    status: string
    step: string
    progress: number
    message: string | null
    ai_requested: boolean
    ai_used: boolean
    ai_cards_created: number
    files_processed: number
    cards_created: number
  } | null>(null)

  const showStatus = (
    type: "info" | "success" | "error",
    text: string,
    options: { autoClear?: boolean; durationMs?: number } = {}
  ) => {
    const { autoClear = type !== "info", durationMs = 9000 } = options

    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current)
      statusTimeoutRef.current = null
    }

    setStatus({ type, text })

    if (autoClear) {
      statusTimeoutRef.current = setTimeout(() => setStatus(null), durationMs)
    }
  }

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (grokEnabled) {
      showStatus("success", "IA Grok ativada para importação de cards", { durationMs: 12000 })
    }
  }, [grokEnabled])

  // Listen for import job updates
  const lastCardsCreatedRef = useRef<number>(0)
  
  useEffect(() => {
    if (!supabase || !projectId) return
    let mounted = true

    const fetchRunningJob = async () => {
      const { data } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'running')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (mounted && data) {
        const jobData = data as any
        setImportJob(jobData)
        lastCardsCreatedRef.current = jobData.cards_created || 0
      }
    }

    fetchRunningJob()

    const channel = supabase
      .channel(`import_job_project:${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'import_jobs',
        filter: `project_id=eq.${projectId}`
      }, (payload: any) => {
        if (!mounted) return
        const row = payload.new
        if (row) {
          setImportJob(row)
          
          // Reload cards when a new card is created (incremental mode)
          const newCardsCreated = row.cards_created || 0
          if (newCardsCreated > lastCardsCreatedRef.current) {
            lastCardsCreatedRef.current = newCardsCreated
            loadCards(true) // Incremental: não mostra "Carregando..." e adiciona apenas novos
          }
          
          // If done, just clear the banner after delay (no reload needed - cards already loaded incrementally)
          if (row.status === 'done') {
            setTimeout(() => { if (mounted) setImportJob(null) }, 8000)
          } else if (row.status === 'error') {
            setTimeout(() => { if (mounted) setImportJob(null) }, 10000)
          }
        }
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [supabase, projectId])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!projectId) return

      // Carregar projeto primeiro; só depois buscar membros/cards.
      // Isso evita múltiplas requisições/erros quando o `id` na URL está inválido.
      const ok = await loadProject()
      if (!ok || cancelled) return

      await Promise.all([loadMembers(), loadCards()])
    }

    run()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const loadProject = async (): Promise<boolean> => {
    if (!projectId) return false
    
    try {
      setLoading(true)
      const response = await projectService.getById(projectId)
      if (response?.success && response?.data) {
        setProject(response.data)
        return true
      } else {
        toast.error(response?.error || 'Erro ao carregar projeto')
        handleBack()
        return false
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar projeto')
      handleBack()
      return false
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    if (!projectId) return
    
    try {
      setLoadingMembers(true)
      const response = await projectService.getMembers(projectId)
      if (response?.success && response?.data) {
        setMembers(response.data)
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar membros')
    } finally {
      setLoadingMembers(false)
    }
  }

  const loadCards = async (incremental: boolean = false) => {
    if (!projectId) return
    
    try {
      if (!incremental) {
        setLoadingCards(true)
      }
      const response = await projectService.getCards(projectId)
      if (response?.success && response?.data) {
        const allCards = response.data
        // Merge incremental: adiciona apenas novos cards
        if (incremental) {
          setCards(prevCards => {
            const existingIds = new Set(prevCards.map((c: any) => c.cardFeatureId))
            const newCards = allCards.filter((c: any) => !existingIds.has(c.cardFeatureId))
            return [...prevCards, ...newCards]
          })
          
          // Buscar apenas os novos card features
          const newProjectCards = allCards.filter((c: any) => 
            !cardFeatures.some(f => f.id === c.cardFeatureId)
          )
          
          if (newProjectCards.length > 0) {
            const cardFeaturePromises = newProjectCards.map(async (projectCard: any) => {
              try {
                const cardResponse = await cardFeatureService.getById(projectCard.cardFeatureId)
                if (cardResponse?.success && cardResponse?.data) {
                  return cardResponse.data
                }
                return null
              } catch (error) {
                console.error(`Erro ao buscar card feature ${projectCard.cardFeatureId}:`, error)
                return null
              }
            })
            
            const newFeatures = await Promise.all(cardFeaturePromises)
            setCardFeatures(prev => {
              const existingIds = new Set(prev.map(f => f.id))
              const uniqueNewFeatures = newFeatures.filter((f): f is CardFeature => 
                f !== null && !existingIds.has(f.id)
              )
              return [...prev, ...uniqueNewFeatures]
            })
          }
        } else {
          // Carregamento inicial: substitui tudo
          setCards(allCards)
          
          // Buscar dados completos dos card features
          const cardFeaturePromises = allCards.map(async (projectCard: any) => {
            try {
              const cardResponse = await cardFeatureService.getById(projectCard.cardFeatureId)
              if (cardResponse?.success && cardResponse?.data) {
                return cardResponse.data
              }
              return null
            } catch (error) {
              console.error(`Erro ao buscar card feature ${projectCard.cardFeatureId}:`, error)
              return null
            }
          })
          
          const features = await Promise.all(cardFeaturePromises)
          setCardFeatures(features.filter((f): f is CardFeature => f !== null))
        }
      }
    } catch (error: any) {
      if (!incremental) {
        toast.error(error.message || 'Erro ao carregar cards')
      }
    } finally {
      if (!incremental) {
        setLoadingCards(false)
      }
    }
  }

  const loadAvailableCards = async () => {
    try {
      const response = await cardFeatureService.getAll({ limit: 100 })
      if (response?.success && response?.data) {
        const projectCardIds = new Set(cards.map((c: any) => c.cardFeatureId))
        const filtered = response.data.filter((card: any) => !projectCardIds.has(card.id))
        setAvailableCards(filtered)
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar cards disponíveis')
    }
  }

  const handleAddCard = async () => {
    if (!selectedCardId || !projectId) {
      toast.error('Selecione um card')
      return
    }

    try {
      showStatus("info", "Adicionando card ao projeto...")
      const response = await projectService.addCard(projectId, selectedCardId)
      if (response?.success) {
        toast.success('Card adicionado ao projeto!')
        setIsAddCardDialogOpen(false)
        setSelectedCardId("")
        loadCards()
        loadAvailableCards()
        showStatus("success", "Card adicionado ao projeto")
      } else {
        showStatus("error", response?.error || "Erro ao adicionar card")
        toast.error(response?.error || 'Erro ao adicionar card')
      }
    } catch (error: any) {
      showStatus("error", error.message || "Erro ao adicionar card")
      toast.error(error.message || 'Erro ao adicionar card')
    }
  }

  const handleRemoveCard = async (cardFeatureId: string) => {
    if (!confirm('Tem certeza que deseja remover este card do projeto?')) {
      return
    }

    try {
      showStatus("info", "Removendo card...")
      const response = await projectService.removeCard(projectId!, cardFeatureId)
      if (response?.success) {
        toast.success('Card removido do projeto!')
        loadCards()
        loadAvailableCards()
        showStatus("success", "Card removido do projeto")
      } else {
        showStatus("error", response?.error || "Erro ao remover card")
        toast.error(response?.error || 'Erro ao remover card')
      }
    } catch (error: any) {
      showStatus("error", error.message || "Erro ao remover card")
      toast.error(error.message || 'Erro ao remover card')
    }
  }

  const handleReorderCard = async (cardFeatureId: string, direction: 'up' | 'down') => {
    if (!projectId) return
    
    try {
      showStatus("info", "Reordenando card...")
      const response = await projectService.reorderCard(projectId, cardFeatureId, direction)
      if (response?.success) {
        toast.success('Card reordenado com sucesso!')
        loadCards()
        showStatus("success", "Ordem dos cards atualizada")
      } else {
        showStatus("error", response?.error || "Erro ao reordenar card")
        toast.error(response?.error || 'Erro ao reordenar card')
      }
    } catch (error: any) {
      showStatus("error", error.message || "Erro ao reordenar card")
      toast.error(error.message || 'Erro ao reordenar card')
    }
  }

  const handleDeleteProject = async () => {
    if (!projectId) return
    
    if (!confirm('Tem certeza que deseja deletar este projeto? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      showStatus("info", "Deletando projeto...")
      const response = await projectService.delete(projectId)
      if (response?.success) {
        toast.success('Projeto deletado com sucesso!')
        showStatus("success", "Projeto deletado")
        handleBack()
      } else {
        showStatus("error", response?.error || "Erro ao deletar projeto")
        toast.error(response?.error || 'Erro ao deletar projeto')
      }
    } catch (error: any) {
      console.error('Erro ao deletar projeto:', error)
      let errorMessage = 'Erro ao deletar projeto'
      if (error?.error) {
        errorMessage = error.error
      } else if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
      showStatus("error", errorMessage)
    }
  }

  const handleSearchUsers = async () => {
    if (!userSearchQuery || userSearchQuery.length < 2) {
      toast.error("Digite pelo menos 2 caracteres")
      return
    }
    
    try {
      setIsSearchingUsers(true)
      const response = await userService.searchUsers(userSearchQuery)
      if (response?.success && response?.data) {
        setUserSearchResults(response.data)
        if (response.data.length === 0) {
          toast.info("Nenhum usuário encontrado")
        }
      } else {
        setUserSearchResults([])
        toast.error(response?.error || "Erro ao buscar usuários")
      }
    } catch (error) {
      toast.error("Erro ao buscar usuários")
    } finally {
      setIsSearchingUsers(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUser || !projectId) return
    
    try {
      showStatus("info", "Adicionando membro...")
      const response = await projectService.addMember(projectId, { userId: selectedUser.id })
      if (response?.success) {
        toast.success("Membro adicionado com sucesso")
        setIsAddMemberDialogOpen(false)
        loadMembers()
        // Reset states
        setSelectedUser(null)
        setUserSearchQuery("")
        setUserSearchResults([])
        showStatus("success", "Membro adicionado ao projeto")
      } else {
        showStatus("error", response?.error || "Erro ao adicionar membro")
        toast.error(response?.error || "Erro ao adicionar membro")
      }
    } catch (error: any) {
      showStatus("error", error.message || "Erro ao adicionar membro")
      toast.error(error.message || "Erro ao adicionar membro")
    }
  }

  const handleBack = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', 'projects')
    params.delete('id') // Remove o id para voltar à lista
    router.push(`/?${params.toString()}`)
  }

  const goToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', tab)
    params.delete('id')
    router.push(`/?${params.toString()}`)
  }

  useEffect(() => {
    if (isAddCardDialogOpen) {
      loadAvailableCards()
    }
  }, [isAddCardDialogOpen])

  // Reset dialog state when closed
  useEffect(() => {
    if (!isAddMemberDialogOpen) {
      setSelectedUser(null)
      setUserSearchQuery("")
      setUserSearchResults([])
    }
  }, [isAddMemberDialogOpen])

  if (loading || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Carregando projeto...</p>
      </div>
    )
  }

  // Deduplicate cardFeatures by id to avoid duplicate keys
  const uniqueCardFeatures = Array.from(
    new Map(cardFeatures.map(f => [f.id, f])).values()
  )

  const filteredCards = uniqueCardFeatures
    .map((cardFeature: CardFeature) => {
      const projectCard = cards.find((c: any) => c.cardFeatureId === cardFeature.id)
      return { cardFeature, projectCard, order: projectCard?.order ?? 999 }
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .filter(({ cardFeature }) => 
      !searchTerm || 
      (cardFeature.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (cardFeature.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )

  const canManageMembers = project.userRole === 'owner' || project.userRole === 'admin'

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto px-2 sm:px-0">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          type="button"
          onClick={() => goToTab("home")}
          className="hover:text-gray-900"
        >
          Início
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <button
          type="button"
          onClick={handleBack}
          className="hover:text-gray-900"
        >
          Projetos
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900 font-medium truncate max-w-[160px] sm:max-w-none">
          {project.name}
        </span>
      </div>

      {/* Status inline */}
      {status && (
        <Alert
          variant={status.type === "error" ? "destructive" : "default"}
          className="border border-gray-200"
        >
          <div className="flex items-start gap-2">
            {status.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
            ) : status.type === "error" ? (
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            )}
            <div>
              <AlertTitle className="text-sm font-semibold">
                {status.type === "success"
                  ? "Tudo certo"
                  : status.type === "error"
                    ? "Algo deu errado"
                    : "Em andamento"}
              </AlertTitle>
              <AlertDescription className="text-sm text-gray-700">
                {status.text}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}


      {/* Header */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              {project.name}
            </h1>
            {project.userRole && (
              <Badge
                variant={project.userRole === "owner" ? "default" : "secondary"}
                className="shrink-0"
              >
                {project.userRole === "owner"
                  ? "Owner"
                  : project.userRole === "admin"
                    ? "Admin"
                    : "Member"}
              </Badge>
            )}
          </div>

          {project.description && (
            <p className="text-sm sm:text-base text-gray-600 mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>

        {/* Ações - Desktop: botão visível, Mobile: menu dropdown */}
        {project.userRole === "owner" && (
          <>
            {/* Desktop */}
            <div className="hidden sm:block">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteProject}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar Projeto
              </Button>
            </div>

            {/* Mobile - Menu Dropdown */}
            <div className="sm:hidden absolute top-0 right-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDeleteProject}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Projeto
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      {/* Import Progress Banner - Sticky between Header and Tabs */}
      {importJob && (
        <div className="sticky top-0 z-50 mb-4 -mx-2 sm:-mx-0 px-2 sm:px-0">
          <div className={`rounded-lg border p-3 md:p-4 shadow-md ${
            importJob.status === 'error' 
              ? 'bg-red-50 border-red-200' 
              : importJob.status === 'done'
                ? 'bg-green-50 border-green-200'
                : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                importJob.status === 'error'
                  ? 'bg-red-100'
                  : importJob.status === 'done'
                    ? 'bg-green-100'
                    : 'bg-blue-100'
              }`}>
                {importJob.status === 'running' ? (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                ) : importJob.status === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`font-semibold text-sm ${
                    importJob.status === 'error'
                      ? 'text-red-800'
                      : importJob.status === 'done'
                        ? 'text-green-800'
                        : 'text-blue-800'
                  }`}>
                    {importJob.status === 'running' 
                      ? '🚀 Importação em andamento' 
                      : importJob.status === 'done'
                        ? '✅ Importação concluída'
                        : '❌ Erro na importação'}
                  </h3>
                  <span className={`text-xs font-medium ${
                    importJob.status === 'error'
                      ? 'text-red-600'
                      : importJob.status === 'done'
                        ? 'text-green-600'
                        : 'text-blue-600'
                  }`}>
                    {importJob.progress}%
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1 truncate">
                  {importJob.message || 'Processando...'}
                </p>
                {importJob.status === 'running' && (
                  <Progress value={importJob.progress} className="h-2 mt-2" />
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                  <span>📁 {importJob.files_processed} arquivos</span>
                  <span>🗂️ {importJob.cards_created} cards</span>
                  {importJob.ai_requested && (
                    <span className={importJob.ai_used ? 'text-green-600 font-medium' : 'text-blue-600'}>
                      <Bot className="h-3 w-3 inline mr-1" />
                      {importJob.ai_used 
                        ? `IA: ${importJob.ai_cards_created} cards` 
                        : 'IA: processando...'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
        </TabsList>

        {/* Tab Cards */}
        <TabsContent value="cards">
          {/* Header dos Cards - Seguindo padrão da tela de Códigos */}
          <div className="space-y-3 mb-4">
            {/* Título + Ações na mesma linha */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Cards do Projeto</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant={isEditMode ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsEditMode(!isEditMode)}
                  title={isEditMode ? "Sair do modo de edição" : "Editar lista"}
                >
                  <Pencil
                    className={`h-4 w-4 ${isEditMode ? "text-blue-600" : "text-gray-500"}`}
                  />
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAddCardDialogOpen(true)}
                  className="h-8 px-3 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Adicionar Card</span>
                </Button>
              </div>
            </div>

            {/* Busca em linha separada (melhor no mobile) */}
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9"
              />
            </div>
          </div>

          {loadingCards ? (
            <p className="text-gray-500 text-center py-8">Carregando...</p>
          ) : filteredCards.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Seus cards aparecerão aqui</p>
          ) : (
            <div className="space-y-4">
              {filteredCards.map(({ cardFeature, projectCard }, index) => {
                const isFirst = index === 0
                const isLast = index === filteredCards.length - 1

                return (
                  <div key={cardFeature.id} className="relative group">
                    <CardFeatureCompact
                      snippet={cardFeature}
                      onEdit={() => {}} // Não permitir editar aqui
                      onDelete={() => {}} // Não permitir deletar aqui
                    />

                    {/* Painel flutuante de ações (apenas no modo de edição) */}
                    {isEditMode && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-2 flex flex-col gap-1 rounded-lg shadow-md border bg-white p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReorderCard(cardFeature.id, "up")
                          }}
                          disabled={isFirst}
                          className="h-7 w-7 p-0"
                          title="Mover para cima"
                        >
                          <ChevronUp
                            className={`h-4 w-4 ${isFirst ? "text-gray-300" : "text-gray-600"}`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReorderCard(cardFeature.id, "down")
                          }}
                          disabled={isLast}
                          className="h-7 w-7 p-0"
                          title="Mover para baixo"
                        >
                          <ChevronDown
                            className={`h-4 w-4 ${isLast ? "text-gray-300" : "text-gray-600"}`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (projectCard) {
                              handleRemoveCard(projectCard.cardFeatureId)
                            }
                          }}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Remover do projeto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab Membros */}
        <TabsContent value="members">
          {/* Header dos Membros - Mesmo padrão */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Membros do Projeto</h2>
              {canManageMembers && (
                <Button
                  size="sm"
                  onClick={() => setIsAddMemberDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Adicionar</span>
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Membros - Direto sem container */}
          {loadingMembers ? (
            <p className="text-gray-500 text-center py-8">Carregando...</p>
          ) : members.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum membro adicionado</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 sm:p-4 bg-white border rounded-lg shadow-sm"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {member.user?.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt={member.user.name || member.user.email}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {member.user?.name || member.user?.email}
                      </p>
                      {member.user?.name && (
                        <p className="text-xs sm:text-sm text-gray-500 truncate">
                          {member.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={member.role === "owner" ? "default" : "secondary"}
                    className="flex-shrink-0 text-xs"
                  >
                    {member.role === "owner"
                      ? "Owner"
                      : member.role === "admin"
                        ? "Admin"
                        : "Member"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Adicionar Card */}
      <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Card ao Projeto</DialogTitle>
            <DialogDescription>
              Selecione um card do diretório para adicionar ao projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="card">Card</Label>
              <select
                id="card"
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione um card</option>
                {availableCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.title} - {card.tech}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCardDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCard}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Membro */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
            <DialogDescription>
              Busque um usuário por email ou nome para adicionar ao projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Email ou nome do usuário..."
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
              />
              <Button onClick={handleSearchUsers} disabled={isSearchingUsers} size="icon">
                {isSearchingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Resultados da Busca */}
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {userSearchResults.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${
                    selectedUser?.id === user.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name || user.email} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                    {user.name && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
                  </div>
                  {selectedUser?.id === user.id && (
                    <Check className="h-4 w-4 text-blue-500" />
                  )}
                </div>
              ))}
              {!isSearchingUsers && userSearchResults.length === 0 && !userSearchQuery && (
                <p className="text-sm text-gray-500 text-center py-2">
                  Busque para encontrar usuários
                </p>
              )}
              {userSearchQuery && !isSearchingUsers && userSearchResults.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  Nenhum usuário encontrado
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUser}>
              Adicionar Membro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
