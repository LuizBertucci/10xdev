"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, Trash2, ChevronUp, ChevronDown, Check, User as UserIcon, Pencil, Loader2, MoreVertical, ChevronRight, Info, CheckCircle2, AlertTriangle, Bot, Link2, List, Settings } from "lucide-react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import { ProjectSummary } from "@/components/ProjectSummary"
import { ProjectCategories } from "@/components/ProjectCategories"
import { usePlatform } from "@/hooks/use-platform"
import { buildCategoryGroups, getAllCategories, orderCategories } from "@/utils/projectCategories"

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
  const [loadingMoreCards, setLoadingMoreCards] = useState(false)
  const [hasMoreCards, setHasMoreCards] = useState(false)
  const [totalCardsCount, setTotalCardsCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const ALL_CATEGORIES_VALUE = "__all__"
  const ALL_CATEGORIES_LABEL = "Todas"
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES_VALUE)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false)
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [savingName, setSavingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [showCategories, setShowCategories] = useState(true)
  const [activeTab, setActiveTab] = useState('codes')

  // Share project state
  const [projectLinkCopied, setProjectLinkCopied] = useState(false)

  // URL compartilhável do projeto
  const shareableProjectUrl = useMemo(() => {
    if (typeof window === 'undefined' || !project) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/?tab=projects&id=${project.id}`
  }, [project])

  // Função para copiar URL do projeto
  const handleCopyProjectUrl = async () => {
    if (!shareableProjectUrl) {
      toast.error('Link não disponível')
      return
    }
    try {
      await navigator.clipboard.writeText(shareableProjectUrl)
      setProjectLinkCopied(true)
      toast.success('Link do projeto copiado!')
      setTimeout(() => setProjectLinkCopied(false), 2000)
    } catch (err) {
      toast.error('Erro ao copiar link do projeto')
    }
  }

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

  useEffect(() => {
    if (project?.name && !isEditingName) {
      setNameDraft(project.name)
    }
  }, [project?.name, isEditingName])

  // Listen for import job updates
  const lastCardsCreatedRef = useRef<number>(0)
  
  useEffect(() => {
    if (!supabase || !projectId) return
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const fetchRunningJob = async () => {
      try {
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
      } catch (error) {
        console.error('Erro ao buscar job de importação:', error)
      }
    }

    fetchRunningJob()

    // Tentar criar subscription Realtime para atualizações do job de importação
    // Se falhar, a aplicação continua funcionando normalmente (apenas sem updates em tempo real)
    try {
      channel = supabase
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
    } catch (error) {
      // Erro ao criar subscription - não crítico, aplicação continua funcionando
      // O erro do WebSocket no console é esperado se o Realtime não estiver disponível
      console.warn('Realtime: Não foi possível criar subscription de import job. A aplicação continuará funcionando normalmente.', error)
    }

    return () => {
      mounted = false
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel)
        } catch (error) {
          console.error('Erro ao remover canal:', error)
        }
      }
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

  const loadCards = async (incremental: boolean = false, loadMore: boolean = false) => {
    if (!projectId) return
    
    try {
      if (loadMore) {
        setLoadingMoreCards(true)
      } else if (!incremental) {
        setLoadingCards(true)
      }
      const response = await projectService.getCards(projectId)
      if (response?.success && response?.data) {
        const newCards = response.data
        const totalCount = response.count ?? newCards.length

        setTotalCardsCount(totalCount)
        setHasMoreCards(false)
        setCards(newCards)

        const features = newCards
          .map((projectCard: any) => projectCard.cardFeature)
          .filter(Boolean) as CardFeature[]
        setCardFeatures(features)
      }
    } catch (error: any) {
      if (!incremental && !loadMore) {
        toast.error(error.message || 'Erro ao carregar cards')
      } else if (loadMore) {
        toast.error('Erro ao carregar mais cards')
      }
    } finally {
      if (loadMore) {
        setLoadingMoreCards(false)
      } else if (!incremental) {
        setLoadingCards(false)
      }
    }
  }
  
  const loadMoreCards = async () => {
    await loadCards(false, true)
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

  const startEditName = () => {
    if (!canManageMembers) return
    setNameDraft(project?.name || "")
    setIsEditingName(true)
    requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }

  const cancelEditName = () => {
    setNameDraft(project?.name || "")
    setIsEditingName(false)
  }

  const saveProjectName = async () => {
    if (!projectId) return
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      toast.error("Nome do projeto é obrigatório")
      return
    }
    if (trimmed === project?.name) {
      setIsEditingName(false)
      return
    }
    try {
      setSavingName(true)
      const response = await projectService.update(projectId, { name: trimmed })
      if (response?.success) {
        setProject((prev) => {
          if (!prev) return response.data || prev
          if (!response.data) return { ...prev, name: trimmed }
          return {
            ...prev,
            ...response.data,
            userRole: prev.userRole,
            memberCount: prev.memberCount,
            cardCount: prev.cardCount,
            cardsCreatedCount: prev.cardsCreatedCount
          }
        })
        setIsEditingName(false)
      } else {
        showStatus("error", response?.error || "Erro ao atualizar nome")
      }
    } catch (error: any) {
      showStatus("error", error?.message || "Erro ao atualizar nome")
    } finally {
      setSavingName(false)
    }
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

  // Deduplicate cardFeatures by id to avoid duplicate keys
  const uniqueCardFeatures = Array.from(
    new Map(cardFeatures.map(f => [f.id, f])).values()
  )

  const categoryGroups = useMemo(() => {
    return buildCategoryGroups(uniqueCardFeatures)
  }, [uniqueCardFeatures])

  const allCategories = useMemo(() => {
    return getAllCategories(categoryGroups)
  }, [categoryGroups])

  const orderedCategories = useMemo(() => {
    return orderCategories(allCategories, project?.categoryOrder || [])
  }, [allCategories, project?.categoryOrder])

  const categoryFilterIds = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES_VALUE) {
      return null
    }
    const cardsInCategory = categoryGroups.get(selectedCategory) || []
    return new Set(cardsInCategory.map((card) => card.id))
  }, [categoryGroups, selectedCategory])

  useEffect(() => {
    if (selectedCategory === ALL_CATEGORIES_VALUE) {
      return
    }
    if (!orderedCategories.includes(selectedCategory)) {
      setSelectedCategory(ALL_CATEGORIES_VALUE)
    }
  }, [orderedCategories, selectedCategory])

  const filteredCards = uniqueCardFeatures
    .map((cardFeature: CardFeature) => {
      const projectCard = cards.find((c: any) => c.cardFeatureId === cardFeature.id)
      return { cardFeature, projectCard, order: projectCard?.order ?? 999 }
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .filter(({ cardFeature }) => 
      (!searchTerm || 
        (cardFeature.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (cardFeature.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      ) &&
      (!categoryFilterIds || categoryFilterIds.has(cardFeature.id))
    )

  const canManageMembers = project?.userRole === 'owner' || project?.userRole === 'admin'
  if (loading || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Carregando projeto...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto px-2 sm:px-0">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm">
        <button
          type="button"
          onClick={() => goToTab("home")}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
        >
          Início
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <button
          type="button"
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
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
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0 group">
            {isEditingName ? (
              <div className="flex items-center gap-2 min-w-0">
                <Input
                  ref={nameInputRef}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      saveProjectName()
                    } else if (e.key === "Escape") {
                      e.preventDefault()
                      cancelEditName()
                    }
                  }}
                  disabled={savingName}
                  className="h-9 w-full max-w-[320px] sm:max-w-[360px] text-sm sm:text-base font-semibold"
                />
                <Button
                  size="sm"
                  onClick={saveProjectName}
                  disabled={savingName}
                  className="h-8 px-3"
                >
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelEditName}
                  disabled={savingName}
                  className="h-8 px-3"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate leading-tight">
                  <span className="text-gray-900 font-bold">Projeto:</span>{" "}
                  {project.name}
                </h1>
                {canManageMembers && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditName}
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Renomear projeto"
                  >
                    <Pencil className="h-4 w-4 text-gray-500" />
                  </Button>
                )}
              </>
            )}
          </div>

          {project.description && (
            <p className="text-sm sm:text-base text-gray-600 mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 flex-row-reverse">
          <Button
            size="sm"
            onClick={() => setIsAddCardDialogOpen(true)}
            className="h-8 px-3 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Adicionar Card</span>
          </Button>

          {project.userRole && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditMode(!isEditMode)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {isEditMode ? "Sair do modo de edição" : "Editar lista"}
                </DropdownMenuItem>
                {project.userRole === "owner" && (
                  <DropdownMenuItem
                    onClick={handleDeleteProject}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Projeto
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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

      {/* Tabs de navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="codes">Códigos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          {/* Botão toggle do Sumário - visível apenas na tab Códigos */}
          {activeTab === 'codes' && (
            <Collapsible open={isSummaryOpen} onOpenChange={setIsSummaryOpen} className="w-full">
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:w-auto"
                >
                  <List className="h-4 w-4 mr-2" />
                  <span className="md:hidden">{isSummaryOpen ? 'Ocultar' : 'Ver'} Sumário</span>
                  <span className="hidden md:inline">Ver Sumário</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="md:hidden mt-2">
                <ProjectCategories
                  categories={orderedCategories}
                  counts={categoryGroups}
                  selectedCategory={selectedCategory}
                  onSelect={setSelectedCategory}
                  allLabel={ALL_CATEGORIES_LABEL}
                  allValue={ALL_CATEGORIES_VALUE}
                  allCount={uniqueCardFeatures.length}
                  loading={loadingCards}
                  loadingText="Carregando categorias..."
                  emptyText="Sem categorias"
                  className="max-h-[300px] overflow-y-auto"
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <TabsContent value="codes" className="space-y-3">

          {/* Grid dinâmico: 1 coluna quando escondido, 2 colunas quando visível */}
          <div className={`gap-4 ${showCategories ? 'grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]' : 'grid grid-cols-1'}`}>
            {/* ProjectCategories - aparece apenas quando showCategories é true */}
            {showCategories && (
              <ProjectCategories
                categories={orderedCategories}
                counts={categoryGroups}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                allLabel={ALL_CATEGORIES_LABEL}
                allValue={ALL_CATEGORIES_VALUE}
                allCount={uniqueCardFeatures.length}
                loading={loadingCards}
                loadingText="Carregando categorias..."
                emptyText="Sem categorias"
                className="hidden md:block md:h-[520px] md:overflow-y-auto"
              />
            )}

            <div className="space-y-3">
              {/* Barra de busca acima dos cards */}
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9"
                />
              </div>

              <ProjectSummary
                projectId={projectId}
                cardFeatures={uniqueCardFeatures}
                isOpen={isSummaryOpen}
                onOpenChange={setIsSummaryOpen}
                showTrigger={false}
              />

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
                      <div key={cardFeature.id} className="relative group min-w-0 overflow-hidden">
                        <CardFeatureCompact
                          snippet={cardFeature}
                          onEdit={() => {}} // Não permitir editar aqui
                          onDelete={() => {}} // Não permitir deletar aqui
                          expandOnClick
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
                  
                  {/* Botão "Carregar mais cards" */}
                  {hasMoreCards && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={loadMoreCards}
                        disabled={loadingMoreCards}
                        className="min-w-[200px]"
                      >
                        {loadingMoreCards ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          <>
                            Carregar mais cards
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
            {/* Sidebar - Menu de Configurações (apenas desktop) */}
            <div className="hidden md:block">
              <div className="w-full text-left px-3 py-2 rounded-md bg-blue-50 text-blue-700 font-medium text-sm border border-blue-200">
                Geral
              </div>
            </div>
            
            {/* Conteúdo - Todos os cards empilhados */}
            <div className="max-w-2xl space-y-4">
            {/* Card: Compartilhar Projeto com Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-5 w-5" />
                  Compartilhar
                </CardTitle>
                <CardDescription>
                  Copie o link para convidar outras pessoas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={shareableProjectUrl}
                    readOnly
                    className="flex-1 bg-gray-50 text-sm"
                  />
                  <Button 
                    variant={projectLinkCopied ? 'default' : 'outline'}
                    onClick={handleCopyProjectUrl}
                    size="icon"
                    disabled={!shareableProjectUrl || !project}
                    className={projectLinkCopied ? 'bg-green-600 hover:bg-green-700 text-white' : 'shrink-0'}
                  >
                    {projectLinkCopied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  </Button>
                </div>
                {projectLinkCopied && (
                  <p className="text-sm text-green-600 mt-2">Link copiado!</p>
                )}
              </CardContent>
            </Card>

            {/* Card: Membros do Projeto - Lista Expandida */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-5 w-5" />
                      Membros do Projeto
                    </CardTitle>
                    <CardDescription>
                      {members.length} {members.length === 1 ? 'pessoa participa' : 'pessoas participam'}
                    </CardDescription>
                  </div>
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
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                    <span className="text-gray-500">Carregando membros...</span>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Nenhum membro adicionado</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Clique em "Adicionar" para convidar pessoas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          {member.user?.avatarUrl ? (
                            <img
                              src={member.user.avatarUrl}
                              alt={member.user.name || member.user.email}
                              className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {member.user?.name || member.user?.email}
                            </p>
                            {member.user?.name && (
                              <p className="text-xs text-gray-500 truncate">
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
              </CardContent>
            </Card>

            {/* Card: Editar Lista */}
            {canManageMembers && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Pencil className="h-5 w-5" />
                    Organização
                  </CardTitle>
                  <CardDescription>
                    Reordene e gerencie os cards do projeto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditMode(!isEditMode)}
                    className="w-full sm:w-auto"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {isEditMode ? 'Sair do modo de edição' : 'Editar lista de cards'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Card: Deletar Projeto (separado e destacado) */}
            {project.userRole === "owner" && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-red-700">
                    <Trash2 className="h-5 w-5" />
                    Zona de Perigo
                  </CardTitle>
                  <CardDescription className="text-red-600/80">
                    Ações irreversíveis para o projeto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteProject}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Projeto
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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

      {/* Dialog Membros */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Membros do Projeto</DialogTitle>
            <DialogDescription>
              Visualize quem participa e adicione novos membros.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Lista de membros</h3>
              <Button
                size="sm"
                onClick={() => setIsAddMemberDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            </div>

            {loadingMembers ? (
              <p className="text-gray-500 text-center py-6">Carregando...</p>
            ) : members.length === 0 ? (
              <p className="text-gray-500 text-center py-6">Nenhum membro adicionado</p>
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
          </div>
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
