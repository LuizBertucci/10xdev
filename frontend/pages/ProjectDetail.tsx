"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, Trash2, ChevronUp, ChevronDown, Check, User as UserIcon, Pencil, Loader2, ChevronRight, Info, CheckCircle2, AlertTriangle, Bot, Link2, List, Settings, UserPlus, Code2, GitBranch, RefreshCw, ExternalLink, Unplug, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { projectService, type Project, type ProjectMember, type ProjectCard, type SyncStatusResponse } from "@/services"
import { cardFeatureService, type CardFeature } from "@/services"
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
import CardFeatureCompact from "@/components/CardFeatureCompact"
import CardFeatureModal from "@/components/CardFeatureModal"
import GitSyncProgressModal from "@/components/GitSyncProgressModal"
import { ProjectSummary } from "@/components/ProjectSummary"
import { ProjectCategories } from "@/components/ProjectCategories"
import { AddMemberInProject } from "@/components/AddMemberInProject"
import { buildCategoryGroups, getAllCategories, orderCategories } from "@/utils/projectCategories"
import { useAuth } from "@/hooks/useAuth"
import { ContentType } from "@/types"

type ImportJobState = {
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
}

type GitSyncProgressEvent = {
  id: string
  timestamp: number
  status: string
  progress: number
  message: string
}

const getGitSyncHistoryStorageKey = (projectId: string) => `gitsync_progress_events:${projectId}`

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null) {
    const maybe = error as { error?: string; message?: string; statusCode?: number }
    if (typeof maybe.error === 'string' && maybe.error.trim()) return maybe.error
    if (typeof maybe.message === 'string' && maybe.message.trim()) return maybe.message
    if (typeof maybe.statusCode === 'number') return `${fallback} (HTTP ${maybe.statusCode})`
  }
  return fallback
}

interface ProjectDetailProps {
  id?: string
}

export default function ProjectDetail({ id }: ProjectDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = id || searchParams?.get('id') || null
  const { user, isAuthenticated } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [cards, setCards] = useState<ProjectCard[]>([])
  const [cardFeatures, setCardFeatures] = useState<CardFeature[]>([])
  const [availableCards, setAvailableCards] = useState<CardFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingCards, setLoadingCards] = useState(false)
  const [loadingMoreCards, setLoadingMoreCards] = useState(false)
  const [hasMoreCards, setHasMoreCards] = useState(false)
  const [_totalCardsCount, setTotalCardsCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const ALL_CATEGORIES_VALUE = "__all__"
  const ALL_CATEGORIES_LABEL = "Todas"
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES_VALUE)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false)
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const [expandModalCard, setExpandModalCard] = useState<CardFeature | null>(null)
  const [isGeneratingModalSummary, setIsGeneratingModalSummary] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [savingName, setSavingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [showCategories, setShowCategories] = useState(true)
  const [activeTab, setActiveTab] = useState('codes')

  // Share project state (usado no card Compartilhar da aba Configurações)
  const [projectLinkCopied, setProjectLinkCopied] = useState(false)
  const shareableProjectUrl = useMemo(() => {
    if (typeof window === 'undefined' || !project) return ''
    return `${window.location.origin}/projects/${project.id}`
  }, [project])
  const handleCopyProjectUrl = async () => {
    if (!shareableProjectUrl) return
    try {
      await navigator.clipboard.writeText(shareableProjectUrl)
      setProjectLinkCopied(true)
      toast.success('Link do projeto copiado!')
      setTimeout(() => setProjectLinkCopied(false), 2000)
    } catch { toast.error('Erro ao copiar link do projeto') }
  }

  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const grokEnabled = process.env.NEXT_PUBLIC_GROK_ENABLED === "true"
  const [status, setStatus] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null)

  // GitSync state
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showRepoDialog, setShowRepoDialog] = useState(false)
  const [availableRepos, setAvailableRepos] = useState<Array<{ owner: string; name: string; full_name: string; default_branch: string }>>([])
  const [selectedRepo, setSelectedRepo] = useState<string>("")
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const handledOAuthFlowRef = useRef<string | null>(null)
  const [showGitSyncProgressModal, setShowGitSyncProgressModal] = useState(false)
  const [gitSyncProgressEvents, setGitSyncProgressEvents] = useState<GitSyncProgressEvent[]>([])
  const lastProgressSignatureRef = useRef<string | null>(null)
  const progressEventSeqRef = useRef(0)

  const handleRepoDialogChange = (open: boolean) => {
    setShowRepoDialog(open)
    if (open) setShowGitSyncProgressModal(false)
  }

  const handleGitSyncProgressModalChange = (open: boolean) => {
    setShowGitSyncProgressModal(open)
    if (open) setShowRepoDialog(false)
  }

  // Import job state
  const supabase = useMemo(() => { try { return createClient() } catch { return null } }, [])
  const [importJob, setImportJob] = useState<ImportJobState | null>(null)

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

  const pushGitSyncProgressEvent = (job: ImportJobState) => {
    const message = job.message?.trim() || 'Processando conexão com GitHub...'
    const signature = `${job.id}|${job.status}|${job.step}|${job.progress}|${message}`
    if (lastProgressSignatureRef.current === signature) return
    lastProgressSignatureRef.current = signature

    setGitSyncProgressEvents((prev) => {
      progressEventSeqRef.current += 1
      const next: GitSyncProgressEvent = {
        id: `${job.id}-${Date.now()}-${progressEventSeqRef.current}`,
        timestamp: Date.now(),
        status: job.status,
        progress: job.progress,
        message
      }
      return [next, ...prev].slice(0, 120)
    })
  }

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem(getGitSyncHistoryStorageKey(projectId))
      if (!raw) return
      const parsed = JSON.parse(raw) as GitSyncProgressEvent[]
      if (!Array.isArray(parsed)) return
      setGitSyncProgressEvents(parsed.slice(0, 120))
    } catch {
      // ignore invalid cached history
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') return
    try {
      sessionStorage.setItem(
        getGitSyncHistoryStorageKey(projectId),
        JSON.stringify(gitSyncProgressEvents.slice(0, 120))
      )
    } catch {
      // ignore storage errors
    }
  }, [gitSyncProgressEvents, projectId])

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

  // Load GitSync status
  const loadSyncStatus = async () => {
    if (!projectId) return
    try {
      const res = await projectService.getSyncStatus(projectId)
      if (res?.success && res.data) {
        setSyncStatus(res.data)
      }
    } catch {
      // Silently ignore - sync may not be configured
    }
  }

  useEffect(() => {
    if (projectId) {
      loadSyncStatus()
    }
  }, [projectId])

  // Detectar retorno do OAuth do GitHub (URL ou sessionStorage quando redirect perde params)
  useEffect(() => {
    if (!searchParams || !projectId) return

    const gitsyncFlag = searchParams.get('gitsync')
    const hasOAuthReturnFlag = searchParams.has('oauth_return')
    const hasInstallationInUrl = searchParams.has('installation_id')
    const isOAuthCallbackFlow =
      gitsyncFlag === 'true' || hasOAuthReturnFlag || hasInstallationInUrl
    if (!isOAuthCallbackFlow) return

    let installationId = searchParams.get('installation_id') || null
    if (!installationId && isOAuthCallbackFlow) {
      installationId = typeof window !== 'undefined' ? sessionStorage.getItem('gitsync_installation_id') : null
    }

    const shouldShowRepoDialog = Boolean(installationId)
    if (!shouldShowRepoDialog) return
    if (!isAuthenticated) return

    const flowKey = `${projectId}:${installationId}:${searchParams.toString()}`
    if (handledOAuthFlowRef.current === flowKey) return
    handledOAuthFlowRef.current = flowKey

    const storedProjectId = sessionStorage.getItem('gitsync_project_id')
    const isForThisProject = (storedProjectId && storedProjectId === projectId) || !storedProjectId

    if (isForThisProject) {
      if (storedProjectId) sessionStorage.removeItem('gitsync_project_id')
      loadAvailableRepos(Number(installationId), () => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('gitsync')
        params.delete('installation_id')
        const newQuery = params.toString()
        if (newQuery !== searchParams.toString()) {
          router.replace(`/projects/${projectId}`)
        }
      })
    }
  }, [searchParams, projectId, isAuthenticated])

  const loadAvailableRepos = async (
    installationId: number,
    onSuccess?: () => void,
    isRetry = false
  ) => {
    try {
      setLoadingRepos(true)
      handleRepoDialogChange(true)

      const response = await projectService.listGithubRepos(installationId)
      if (response?.success && response.data) {
        setAvailableRepos(response.data.map((repo: { owner: { login: string }; name: string; full_name: string; default_branch: string }) => ({
          owner: repo.owner.login,
          name: repo.name,
          full_name: repo.full_name,
          default_branch: repo.default_branch
        })))
        onSuccess?.()
      } else {
        toast.error('Erro ao carregar repositórios')
        handleRepoDialogChange(false)
      }
    } catch (error: unknown) {
      const err = error as { statusCode?: number }
      if (err?.statusCode === 401 && !isRetry) {
        await new Promise(r => setTimeout(r, 800))
        return loadAvailableRepos(installationId, onSuccess, true)
      }
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar repositórios')
      handleRepoDialogChange(false)
    } finally {
      setLoadingRepos(false)
    }
  }

  const handleConnectRepo = async () => {
    if (!projectId || !selectedRepo) {
      toast.error('Selecione um repositório')
      return
    }

    const installationId = sessionStorage.getItem('gitsync_installation_id')
    if (!installationId) {
      toast.error('Installation ID não encontrado')
      return
    }

    const repo = availableRepos.find(r => r.full_name === selectedRepo)
    if (!repo) {
      toast.error('Repositório não encontrado')
      return
    }

    try {
      setConnecting(true)
      handleRepoDialogChange(false)
      setShowGitSyncProgressModal(true)
      setGitSyncProgressEvents((prev) => [{
        id: `connect-start-${Date.now()}-${crypto.randomUUID()}`,
        timestamp: Date.now(),
        status: 'running',
        progress: 0,
        message: 'Conectando repositório e iniciando importação...'
      }, ...prev].slice(0, 120))
      lastProgressSignatureRef.current = null
      showStatus('info', 'Conectando repositório e iniciando importação...')
      const response = await projectService.connectRepo(projectId, {
        installationId: Number(installationId),
        owner: repo.owner,
        repo: repo.name,
        defaultBranch: repo.default_branch || 'main'
      })

      if (response?.success) {
        toast.success('Repositório conectado com sucesso!')
        setGitSyncProgressEvents((prev) => [{
          id: `connect-success-${Date.now()}-${crypto.randomUUID()}`,
          timestamp: Date.now(),
          status: 'done',
          progress: 100,
          message: response.message || 'Repositório conectado com sucesso.'
        }, ...prev].slice(0, 120))
        setSelectedRepo("")
        await loadSyncStatus()
        sessionStorage.removeItem('gitsync_installation_id')
      } else {
        toast.error(response?.error || 'Erro ao conectar repositório')
        setGitSyncProgressEvents((prev) => [{
          id: `connect-non-success-${Date.now()}-${crypto.randomUUID()}`,
          timestamp: Date.now(),
          status: 'error',
          progress: importJob?.progress ?? 0,
          message: response?.error || 'Erro ao conectar repositório'
        }, ...prev].slice(0, 120))
        handleRepoDialogChange(true)
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Erro ao conectar repositório')
      toast.error(errorMessage)
      setGitSyncProgressEvents((prev) => [{
        id: `connect-error-${Date.now()}-${crypto.randomUUID()}`,
        timestamp: Date.now(),
        status: 'error',
        progress: importJob?.progress ?? 0,
        message: errorMessage
      }, ...prev].slice(0, 120))
      handleRepoDialogChange(true)
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    if (!projectId || syncing) return
    try {
      setSyncing(true)
      const res = await projectService.syncProject(projectId)
      if (res?.success) {
        toast.success(res.message || 'Sincronização concluída')
        await loadSyncStatus()
        // Reload cards to show updated content
        loadCards(true)
      } else {
        toast.error(res?.error || 'Erro ao sincronizar')
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao sincronizar com o GitHub')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!projectId) return
    try {
      const res = await projectService.disconnectRepo(projectId)
      if (res?.success) {
        toast.success('Repositório desconectado')
        setSyncStatus(null)
      } else {
        toast.error('Erro ao desconectar')
      }
    } catch {
      toast.error('Erro ao desconectar repositório')
    }
  }

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
          const jobData = data as ImportJobState
          setImportJob(jobData)
          pushGitSyncProgressEvent(jobData)
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
          event: '*' as const,
          schema: 'public',
          table: 'import_jobs',
          filter: `project_id=eq.${projectId}`
        }, (payload) => {
          if (!mounted) return
          const row = payload.new as ImportJobState
          if (row) {
            setImportJob(row)
            pushGitSyncProgressEvent(row)
            
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar projeto')
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar membros')
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
          .map((projectCard: ProjectCard) => projectCard.cardFeature)
          .filter((cardFeature): cardFeature is NonNullable<NonNullable<ProjectCard>['cardFeature']> => cardFeature !== undefined && cardFeature !== null)
        setCardFeatures(features)
      }
    } catch (error: unknown) {
      if (!incremental && !loadMore) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar cards')
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

  const handleGenerateSummaryFromModal = async (cardId: string, prompt?: string) => {
    try {
      setIsGeneratingModalSummary(true)
      await cardFeatureService.generateSummary(cardId, true, prompt?.trim() || undefined)

      const updated = await cardFeatureService.getById(cardId)
      if (!updated?.success || !updated.data) {
        toast.success('Resumo gerado com sucesso!')
        return
      }

      const updatedCard = updated.data

      setExpandModalCard(updatedCard)
      setCardFeatures((prev) => prev.map((card) => (card.id === cardId ? updatedCard : card)))
      setCards((prev) =>
        prev.map((projectCard) =>
          projectCard.cardFeatureId === cardId
            ? { ...projectCard, cardFeature: updatedCard }
            : projectCard
        )
      )

      toast.success('Resumo gerado com sucesso!')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar resumo')
    } finally {
      setIsGeneratingModalSummary(false)
    }
  }

  const handleSaveSummaryFromModal = async (cardId: string, summaryContent: string) => {
    const normalizeScreenName = (name?: string) =>
      (name || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const isSummaryScreen = (name?: string) => {
      const normalized = normalizeScreenName(name)
      return normalized === 'resumo' || normalized === 'sumario' || normalized === 'visao geral'
    }

    try {
      const baseCard =
        cardFeatures.find((card) => card.id === cardId) ||
        (expandModalCard?.id === cardId ? expandModalCard : null)

      if (!baseCard) {
        toast.error('Card não encontrado para salvar resumo')
        return
      }

      const existingSummaryScreen = baseCard.screens.find((screen) => isSummaryScreen(screen.name))
      const existingTextBlock = existingSummaryScreen?.blocks?.find((block) => block.type === 'text')
      const summaryBlockId = existingTextBlock?.id || cardFeatureService.generateUUID()

      const nextSummaryScreen = {
        ...(existingSummaryScreen || {}),
        name: 'Visão Geral',
        description: existingSummaryScreen?.description || 'Resumo do card',
        route: existingSummaryScreen?.route || '',
        blocks: [
          {
            id: summaryBlockId,
            type: ContentType.TEXT,
            content: summaryContent,
            order: 0
          }
        ]
      }

      const nonSummaryScreens = baseCard.screens.filter((screen) => !isSummaryScreen(screen.name))
      const nextScreens = [nextSummaryScreen, ...nonSummaryScreens]

      const updated = await cardFeatureService.update(cardId, { screens: nextScreens })
      if (!updated?.success || !updated.data) {
        toast.error(updated?.error || 'Erro ao salvar Visão Geral')
        return
      }

      const updatedCard = updated.data
      setExpandModalCard(updatedCard)
      setCardFeatures((prev) => prev.map((card) => (card.id === cardId ? updatedCard : card)))
      setCards((prev) =>
        prev.map((projectCard) =>
          projectCard.cardFeatureId === cardId
            ? { ...projectCard, cardFeature: updatedCard }
            : projectCard
        )
      )

      toast.success('Visão Geral atualizada')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar Visão Geral')
    }
  }


  const loadAvailableCards = async () => {
    try {
      const response = await cardFeatureService.getAll({ limit: 100 })
      if (response?.success && response?.data) {
        const projectCardIds = new Set(cards.map((c) => c.cardFeatureId))
        const filtered = response.data.filter((card) => !projectCardIds.has(card.id))
        setAvailableCards(filtered)
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar cards disponíveis')
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
    } catch (error: unknown) {
      showStatus("error", error instanceof Error ? error.message : "Erro ao adicionar card")
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar card')
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
    } catch (error: unknown) {
      showStatus("error", error instanceof Error ? error.message : "Erro ao remover card")
      toast.error(error instanceof Error ? error.message : 'Erro ao remover card')
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
    } catch (error: unknown) {
      showStatus("error", error instanceof Error ? error.message : "Erro ao reordenar card")
      toast.error(error instanceof Error ? error.message : 'Erro ao reordenar card')
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
    } catch (error: unknown) {
      console.error('Erro ao deletar projeto:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar projeto'
      toast.error(errorMessage)
      showStatus("error", errorMessage)
    }
  }

  const handleBack = () => {
    router.push('/projects')
  }

  const goToRoute = (route: string) => {
    router.push(route)
  }

  const startEditName = () => {
    if (!canEditProject) return
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
    } catch (error: unknown) {
      showStatus("error", error instanceof Error ? error.message : "Erro ao atualizar nome")
    } finally {
      setSavingName(false)
    }
  }

  useEffect(() => {
    if (isAddCardDialogOpen) {
      loadAvailableCards()
    }
  }, [isAddCardDialogOpen])

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

  const handleCategoryOrderChange = async (newOrder: string[]) => {
    // Atualiza localmente de imediato (otimista)
    setProject((prev) => prev ? { ...prev, categoryOrder: newOrder } : prev)

    if (projectId) {
      try {
        const response = await projectService.update(projectId, { categoryOrder: newOrder })
        if (!response?.success) {
          toast.error(response?.error || 'Erro ao salvar ordem das categorias')
          // Reverte em caso de erro
          setProject((prev) => prev ? { ...prev, categoryOrder: project?.categoryOrder || [] } : prev)
        }
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Erro ao salvar ordem das categorias')
        setProject((prev) => prev ? { ...prev, categoryOrder: project?.categoryOrder || [] } : prev)
      }
    }
  }

  const filteredCards = uniqueCardFeatures
    .map((cardFeature: CardFeature) => {
      const projectCard = cards.find((c) => c.cardFeatureId === cardFeature.id)
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

  const canEditProject = project?.userRole === 'owner' || project?.userRole === 'admin' || user?.role === 'admin'
  const canManageMembers = !!project?.userRole // qualquer membro pode adicionar pessoas
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
          onClick={() => goToRoute('/home')}
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
                {canEditProject && (
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsAddMemberDialogOpen(true)}
              title="Adicionar membro ao projeto"
            >
              <UserPlus className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* GitSync Status Banner */}
      {syncStatus?.active && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 mb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <GitBranch className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span className="text-sm font-medium text-emerald-900 truncate">
                {syncStatus.githubOwner}/{syncStatus.githubRepo}
              </span>
              <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50 flex-shrink-0">
                {syncStatus.defaultBranch}
              </Badge>
              {syncStatus.conflicts > 0 && (
                <Badge variant="destructive" className="text-xs flex-shrink-0">
                  {syncStatus.conflicts} conflito{syncStatus.conflicts > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {syncStatus.lastSyncAt && (
                <span className="text-xs text-emerald-600 hidden sm:inline">
                  Sync: {new Date(syncStatus.lastSyncAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="h-7 px-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100"
                title="Sincronizar com GitHub"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              </Button>
              <a
                href={`https://github.com/${syncStatus.githubOwner}/${syncStatus.githubRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100"
                title="Abrir no GitHub"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDisconnect} className="text-red-600">
                    <Unplug className="h-4 w-4 mr-2" />
                    Desconectar do GitHub
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

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
          {/* Mobile: Painel de categorias condicional */}
          {activeTab === 'codes' && isSummaryOpen && (
            <div className="md:hidden">
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
                sortable
                onOrderChange={handleCategoryOrderChange}
                className="max-h-[300px] overflow-y-auto"
              />
            </div>
          )}

          {/* Desktop: toggle simples do showCategories */}
          {activeTab === 'codes' && (
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => setShowCategories(prev => !prev)}
            >
              <List className="h-4 w-4 mr-2" />
              {showCategories ? 'Ocultar' : 'Ver'} Sumário
            </Button>
          )}

          <div className="flex items-center gap-2 md:ml-auto">
            <TabsList className="bg-white shadow-md rounded-lg p-1 h-auto">
              <TabsTrigger value="settings" className="gap-1.5 px-3.5 py-2 rounded-md text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                <Settings className="h-3.5 w-3.5" />
                Configurações
              </TabsTrigger>
              <TabsTrigger value="codes" className="gap-1.5 px-3.5 py-2 rounded-md text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                <Code2 className="h-3.5 w-3.5" />
                Códigos
              </TabsTrigger>
            </TabsList>
          </div>
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
                sortable
                onOrderChange={handleCategoryOrderChange}
                className="hidden md:block md:h-[520px] md:overflow-y-auto"
              />
            )}

            <div className="space-y-3">
              {/* Barra de busca + botão de edição */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Buscar cards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9"
                  />
                </div>
                <Button
                  variant={isEditMode ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setIsEditMode(!isEditMode)}
                  title={isEditMode ? "Sair do modo de edição" : "Editar lista de cards"}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {activeTab === 'codes' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setIsSummaryOpen(prev => !prev)}
                    title={isSummaryOpen ? 'Ocultar Sumário' : 'Ver Sumário'}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <ProjectSummary
                projectId={projectId}
                cardFeatures={uniqueCardFeatures}
                isOpen={isSummaryOpen}
                onOpenChange={setIsSummaryOpen}
                showTrigger={false}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
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
                          onExpand={(card) => setExpandModalCard(card)}
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
            <div className="space-y-4">
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

            {/* Card: Sincronização com GitHub */}
            <Card className={syncStatus?.active ? "border-emerald-200 bg-emerald-50/30" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="h-5 w-5" />
                  Sincronização com GitHub
                </CardTitle>
                <CardDescription>
                  {syncStatus?.active
                    ? `Conectado a ${syncStatus.githubOwner}/${syncStatus.githubRepo}`
                    : 'Conecte seu repositório GitHub para sincronização automática'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-3 w-full"
                  onClick={() => handleGitSyncProgressModalChange(true)}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Ver progresso da conexão
                </Button>
                {syncStatus?.active ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-full bg-emerald-100">
                          <GitBranch className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {syncStatus.githubOwner}/{syncStatus.githubRepo}
                          </p>
                          <p className="text-xs text-gray-500">
                            Branch: {syncStatus.defaultBranch}
                          </p>
                          {syncStatus.lastSyncAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              Última sincronização: {new Date(syncStatus.lastSyncAt).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0 border-emerald-300 text-emerald-700 bg-emerald-50">
                        Ativo
                      </Badge>
                    </div>

                    {syncStatus.conflicts > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-900">
                              {syncStatus.conflicts} conflito{syncStatus.conflicts > 1 ? 's' : ''} detectado{syncStatus.conflicts > 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-red-700 mt-1">
                              Resolva os conflitos para continuar sincronizando
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex-1"
                        size="sm"
                      >
                        {syncing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sincronizar agora
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://github.com/${syncStatus.githubOwner}/${syncStatus.githubRepo}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir no GitHub
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDisconnect}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Unplug className="h-4 w-4 mr-2" />
                      Desconectar repositório
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <GitBranch className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        Nenhum repositório conectado
                      </p>
                      <p className="text-xs text-gray-500">
                        Conecte um repositório GitHub para sincronizar automaticamente seus cards com o código
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      size="sm"
                      onClick={() => {
                        // Store project ID for post-OAuth redirect
                        try {
                          sessionStorage.setItem('gitsync_project_id', projectId || '')
                        } catch { /* ignore */ }

                        // Redirect to GitHub OAuth
                        const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID

                        if (!githubClientId) {
                          toast.error('GitHub Client ID não configurado')
                          return
                        }

                        // Detect if running on localhost to use correct backend URL
                        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                        const backendUrl = isLocalhost
                          ? 'http://localhost:3001'
                          : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')

                        // Encode frontend origin and projectId in state parameter
                        const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : ''
                        const stateData = JSON.stringify({ origin: frontendOrigin, projectId: projectId || '' })
                        const state = btoa(stateData)

                        // Remove /api suffix if present to avoid duplication
                        const baseUrl = backendUrl.replace(/\/api$/, '')
                        const redirectUri = `${baseUrl}/api/gitsync/callback`
                        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo&state=${encodeURIComponent(state)}`

                        window.location.href = githubAuthUrl
                      }}
                    >
                      <GitBranch className="h-4 w-4 mr-2" />
                      Conectar repositório GitHub
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      💡 Você será redirecionado para autorizar o acesso ao GitHub
                    </p>
                  </div>
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
                              referrerPolicy="no-referrer"
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
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0 object-cover"
                          referrerPolicy="no-referrer"
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
      {projectId && (
        <AddMemberInProject
          open={isAddMemberDialogOpen}
          onOpenChange={setIsAddMemberDialogOpen}
          projectId={projectId}
          members={members}
          onMembersAdded={loadMembers}
        />
      )}

      <GitSyncProgressModal
        open={showGitSyncProgressModal}
        onOpenChange={handleGitSyncProgressModalChange}
        job={importJob}
        events={gitSyncProgressEvents}
      />

      {/* Dialog: Selecionar Repositório GitHub */}
      <Dialog open={showRepoDialog} onOpenChange={handleRepoDialogChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Repositório</DialogTitle>
            <DialogDescription>
              Escolha qual repositório conectar a este projeto
            </DialogDescription>
          </DialogHeader>

          {loadingRepos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">Carregando repositórios...</span>
            </div>
          ) : availableRepos.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Nenhum repositório encontrado</p>
              <p className="text-xs text-gray-500 mt-1">
                Verifique as permissões da GitHub App
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="repo-select">Repositório</Label>
              <select
                id="repo-select"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">Selecione um repositório</option>
                {availableRepos.map((repo) => (
                  <option key={repo.full_name} value={repo.full_name}>
                    {repo.full_name} ({repo.default_branch})
                  </option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                handleRepoDialogChange(false)
                setSelectedRepo("")
              }}
              disabled={connecting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConnectRepo}
              disabled={!selectedRepo || connecting || loadingRepos}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Conectar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Expandido do Card (tela cheia) */}
      <CardFeatureModal
        snippet={expandModalCard}
        isOpen={expandModalCard !== null}
        onClose={() => setExpandModalCard(null)}
        canGenerateSummary={user?.role === 'admin'}
        isGeneratingSummary={isGeneratingModalSummary}
        onGenerateSummary={handleGenerateSummaryFromModal}
        onSaveSummary={handleSaveSummaryFromModal}
      />
    </div>
  )
}
