"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, Trash2, ChevronUp, ChevronDown, Check, User as UserIcon, Pencil, Loader2, MoreVertical, ChevronRight, AlertTriangle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { projectService, type Project, ProjectMemberRole } from "@/services"
import { cardFeatureService, type CardFeature } from "@/services"
import { userService, type User } from "@/services/userService"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import { usePlatform } from "@/hooks/use-platform"
import { ProgressRing } from "@/components/ui/ProgressRing"
import { defaultMessage, type ImportJob } from "@/lib/importJobUtils"

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
  const jobId = searchParams?.get('jobId') || null

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  const [importJob, setImportJob] = useState<any | null>(null)
  const [isJobLoading, setIsJobLoading] = useState(false) // Indica se estamos carregando o job
  const lastJobStatusRef = useRef<string | null>(null)
  const [projectImportJobId, setProjectImportJobId] = useState<string | null>(null)

  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [cardFeatures, setCardFeatures] = useState<CardFeature[]>([])
  const cardFeaturesRef = useRef<Set<string>>(new Set())
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

  // Delete dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteCards, setDeleteCards] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadProject()
      loadMembers()
      loadCards()
    }
  }, [projectId])

  // Se não veio jobId na URL, tenta descobrir se existe importação "running" para este projeto
  useEffect(() => {
    if (!supabase || !projectId) return
    if (jobId) {
      setProjectImportJobId(jobId)
      setIsJobLoading(true) // Marca que vamos carregar o job
      return
    }

    let mounted = true
    setIsJobLoading(true)
    const run = async () => {
      try {
        const { data } = await supabase
          .from('import_jobs')
          .select('id')
          .eq('project_id', projectId)
          .eq('status', 'running')
          .order('updated_at', { ascending: false })
          .limit(1)
        const id = Array.isArray(data) && data.length > 0 ? (data[0] as any).id : null
        if (mounted) {
          setProjectImportJobId(id)
          if (!id) setIsJobLoading(false) // Não há job running
        }
      } catch {
        if (mounted) setIsJobLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [supabase, projectId, jobId])

  // ===========================
  // REALTIME: import_jobs (progresso da importação)
  // ===========================
  useEffect(() => {
    const activeJobId = jobId || projectImportJobId
    if (!supabase || !activeJobId) return

    let isMounted = true

    const fetchInitial = async () => {
      try {
        const { data } = await supabase
          .from('import_jobs')
          .select('*')
          .eq('id', activeJobId)
          .maybeSingle()
        // Se não existe mais (ex.: projeto deletado), limpamos o estado para não travar em 0%.
        if (isMounted) {
          setImportJob(data || null)
          setIsJobLoading(false) // Job carregado (ou não existe)
        }
      } catch {
        // silencioso (job pode não existir/sem permissão)
        if (isMounted) setIsJobLoading(false)
      }
    }

    fetchInitial()

    const channel = supabase
      .channel(`import_job:${activeJobId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'import_jobs', filter: `id=eq.${activeJobId}` },
        (payload) => {
          const row: any = (payload as any).new || null
          if (!row) return
          setImportJob(row)

          const status = row.status as string | undefined
          if (status && status !== lastJobStatusRef.current) {
            lastJobStatusRef.current = status
            if (status === 'done') {
              toast.success('Importação concluída! Cards atualizados em tempo real.')
            } else if (status === 'error') {
              toast.error(row.error || row.message || 'Erro na importação.')
            }
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [supabase, jobId, projectImportJobId])

  // ===========================
  // REALTIME: project_cards (cards aparecendo conforme são associados)
  // ===========================
  useEffect(() => {
    if (!supabase || !projectId) return

    const channel = supabase
      .channel(`project_cards:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_cards', filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const ev = payload.eventType
          const row: any = (payload as any).new || null
          if (!row) return

          const projectCard = {
            id: row.id,
            projectId: row.project_id,
            cardFeatureId: row.card_feature_id,
            addedBy: row.added_by,
            createdAt: row.created_at,
            order: row.order
          }

          // Upsert do projectCard (para refletir order e aparecer na lista)
          setCards((prev) => {
            const idx = prev.findIndex((c: any) => c.id === projectCard.id)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = { ...prev[idx], ...projectCard }
              return next
            }
            return [...prev, projectCard]
          })

          // Em INSERT/UPDATE, garantir que o cardFeature esteja carregado
          if (ev === 'INSERT' || ev === 'UPDATE') {
            const alreadyHas = cardFeaturesRef.current.has(projectCard.cardFeatureId)
            if (!alreadyHas) {
              try {
                const resp = await cardFeatureService.getById(projectCard.cardFeatureId)
                if (resp?.success && resp.data) {
                  setCardFeatures((prev) => {
                    if (prev.some((f) => f.id === resp.data!.id)) return prev
                    return [...prev, resp.data!]
                  })
                  cardFeaturesRef.current.add(projectCard.cardFeatureId)
                }
              } catch {
                // silencioso
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, projectId])

  const importUi = useMemo(() => {
    const activeJobId = jobId || projectImportJobId
    
    // Se ainda está carregando e existe um jobId (vindo da URL), mostra loading genérico
    if (isJobLoading && activeJobId) {
      return { step: 'starting', progress: 0, status: 'running', message: 'Carregando importação…' }
    }
    
    if (!activeJobId) return null
    // Só mostrar UI de importação se o job existe e está realmente rodando.
    if (!importJob) return null
    if (importJob?.status && importJob.status !== 'running') return null
    const step = (importJob?.step as string | undefined) || 'starting'
    const progress = Math.max(0, Math.min(100, Number(importJob?.progress ?? 0)))
    const status = (importJob?.status as string | undefined) || 'running'
    const message =
      (importJob?.message as string | undefined) ||
      ({
        starting: 'Iniciando importação…',
        downloading_zip: 'Baixando o repositório…',
        extracting_files: 'Extraindo arquivos…',
        analyzing_repo: 'Analisando o projeto…',
        generating_cards: 'Organizando cards…',
        creating_cards: 'Criando cards…',
        linking_cards: 'Associando cards ao projeto…',
        done: 'Importação concluída.',
        error: 'Erro na importação.'
      } as any)[step] ||
      'Processando…'

    return { step, progress, status, message }
  }, [jobId, projectImportJobId, importJob, isJobLoading])

  const loadProject = async () => {
    if (!projectId) return
    
    try {
      setLoading(true)
      const response = await projectService.getById(projectId)
      if (response?.success && response?.data) {
        setProject(response.data)
      } else {
        toast.error(response?.error || 'Erro ao carregar projeto')
        handleBack()
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar projeto')
      handleBack()
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

  const loadCards = async () => {
    if (!projectId) return
    
    try {
      setLoadingCards(true)
      const response = await projectService.getCards(projectId)
      if (response?.success && response?.data) {
        setCards(response.data)
        
        // Buscar dados completos dos card features
        const cardFeaturePromises = response.data.map(async (projectCard: any) => {
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
        const cleaned = features.filter((f): f is CardFeature => f !== null)
        setCardFeatures(cleaned)
        cardFeaturesRef.current = new Set(cleaned.map((f) => f.id))
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar cards')
    } finally {
      setLoadingCards(false)
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
      const response = await projectService.addCard(projectId, selectedCardId)
      if (response?.success) {
        toast.success('Card adicionado ao projeto!')
        setIsAddCardDialogOpen(false)
        setSelectedCardId("")
        loadCards()
        loadAvailableCards()
      } else {
        toast.error(response?.error || 'Erro ao adicionar card')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar card')
    }
  }

  const handleRemoveCard = async (cardFeatureId: string) => {
    if (!confirm('Tem certeza que deseja remover este card do projeto?')) {
      return
    }

    try {
      const response = await projectService.removeCard(projectId!, cardFeatureId)
      if (response?.success) {
        toast.success('Card removido do projeto!')
        loadCards()
        loadAvailableCards()
      } else {
        toast.error(response?.error || 'Erro ao remover card')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover card')
    }
  }

  const handleReorderCard = async (cardFeatureId: string, direction: 'up' | 'down') => {
    if (!projectId) return
    
    try {
      const response = await projectService.reorderCard(projectId, cardFeatureId, direction)
      if (response?.success) {
        toast.success('Card reordenado com sucesso!')
        loadCards()
      } else {
        toast.error(response?.error || 'Erro ao reordenar card')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reordenar card')
    }
  }

  const openDeleteDialog = () => {
    // Não permitir exclusão enquanto estiver importando
    if (importUi && importUi.status !== 'done') {
      toast.error(`Importação em andamento (${importUi.progress}%). Aguarde finalizar para excluir este projeto.`)
      return
    }
    setDeleteCards(false)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectId) return

    try {
      setDeleting(true)
      const response = await projectService.delete(projectId, deleteCards)
      if (!response) {
        toast.error('Nenhuma resposta do servidor ao deletar o projeto.')
        return
      }
      if (response.success) {
        toast.success(deleteCards 
          ? 'Projeto e cards deletados com sucesso!' 
          : 'Projeto deletado com sucesso!')
        setIsDeleteDialogOpen(false)
        setDeleteCards(false)
        handleBack()
      } else {
        toast.error(response.error || 'Erro ao deletar projeto')
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
    } finally {
      setDeleting(false)
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
      const response = await projectService.addMember(projectId, { userId: selectedUser.id })
      if (response?.success) {
        toast.success("Membro adicionado com sucesso")
        setIsAddMemberDialogOpen(false)
        loadMembers()
        // Reset states
        setSelectedUser(null)
        setUserSearchQuery("")
        setUserSearchResults([])
      } else {
        toast.error(response?.error || "Erro ao adicionar membro")
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar membro")
    }
  }

  const handleBack = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', 'projects')
    params.delete('id') // Remove o id para voltar à lista
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

  const filteredCards = cardFeatures
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
      <div className="flex items-center space-x-2 text-sm">
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams?.toString() || '')
            params.set('tab', 'home')
            params.delete('id')
            router.push(`/?${params.toString()}`)
          }}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Início
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Projetos
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900 font-medium truncate max-w-[150px] sm:max-w-none">{project.name}</span>
      </div>

      {/* Header do Projeto - Responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Info do Projeto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">{project.name}</h1>
            {project.userRole && (
              <Badge variant={project.userRole === 'owner' ? 'default' : 'secondary'} className="flex-shrink-0">
                {project.userRole === 'owner' ? 'Owner' : 
                 project.userRole === 'admin' ? 'Admin' : 'Member'}
              </Badge>
            )}
          </div>
          {project.description && (
            <p className="text-sm sm:text-base text-gray-600 mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>

        {/* Ações - Desktop: botão visível, Mobile: menu dropdown */}
        {project.userRole === 'owner' && (
          <>
            {/* Desktop */}
            <div className="hidden sm:block">
              {importUi && importUi.status !== 'done' ? null : (
                <Button variant="destructive" size="sm" onClick={openDeleteDialog}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar Projeto
                </Button>
              )}
            </div>
            {/* Mobile - Menu Dropdown */}
            <div className="sm:hidden absolute top-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {importUi && importUi.status !== 'done' ? (
                    <DropdownMenuItem
                      onClick={(e) => e.preventDefault()}
                      className="text-blue-700 opacity-80 cursor-not-allowed"
                    >
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando… ({importUi.progress}%)
                    </DropdownMenuItem>
                  ) : (
                  <DropdownMenuItem onClick={openDeleteDialog} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Projeto
                  </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      {/* Progresso da importação (Realtime) */}
      {importUi && importUi.status !== 'done' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <ProgressRing value={importUi.progress} />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-blue-900">Importando do GitHub</p>
                <span className="text-xs font-medium text-blue-700">{importUi.progress}%</span>
              </div>
              <p className="text-sm text-blue-800 mt-1">{importUi.message}</p>
              <div className="text-xs text-blue-700 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <span>Arquivos: {importJob?.files_processed ?? 0}</span>
                <span>Cards: {importJob?.cards_created ?? 0}</span>
                {importJob?.ai_requested ? (
                  <span>IA: {importJob?.ai_used ? 'usada' : 'pendente/indisponível'}</span>
                ) : (
                  <span>IA: desativada</span>
                )}
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
                  <Pencil className={`h-4 w-4 ${isEditMode ? 'text-blue-600' : 'text-gray-500'}`} />
                </Button>
                <Button size="sm" onClick={() => setIsAddCardDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Adicionar</span>
                </Button>
              </div>
            </div>
            
            {/* Busca - Linha separada */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>

          {/* Lista de Cards - Direto sem container */}
          {loadingCards ? (
            <p className="text-gray-500 text-center py-8">Carregando...</p>
          ) : filteredCards.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum card adicionado</p>
          ) : (
            <div className="space-y-3">
              {filteredCards.map(({ cardFeature, projectCard }, index) => {
                const isFirst = index === 0
                const isLast = index === filteredCards.length - 1
                
                return (
                  <div key={cardFeature.id} className="relative">
                    {/* Card - Largura total */}
                    <CardFeatureCompact
                      snippet={cardFeature}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />

                    {/* Botões de ação - Só visíveis em modo de edição */}
                    {isEditMode && (
                      <div className="absolute -right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 bg-white rounded-lg shadow-md border p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReorderCard(cardFeature.id, 'up')
                          }}
                          disabled={isFirst}
                          className="h-7 w-7 p-0"
                          title="Mover para cima"
                        >
                          <ChevronUp className={`h-4 w-4 ${isFirst ? 'text-gray-300' : 'text-gray-600'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReorderCard(cardFeature.id, 'down')
                          }}
                          disabled={isLast}
                          className="h-7 w-7 p-0"
                          title="Mover para baixo"
                        >
                          <ChevronDown className={`h-4 w-4 ${isLast ? 'text-gray-300' : 'text-gray-600'}`} />
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
                <Button size="sm" onClick={() => setIsAddMemberDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
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
                <div key={member.id} className="flex items-center justify-between p-3 sm:p-4 bg-white border rounded-lg shadow-sm">
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
                      <p className="font-medium text-sm sm:text-base truncate">{member.user?.name || member.user?.email}</p>
                      {member.user?.name && (
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{member.user.email}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
                    {member.role === 'owner' ? 'Owner' : 
                     member.role === 'admin' ? 'Admin' : 'Member'}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Deletar Projeto
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o projeto <strong>"{project?.name}"</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {project && (cards.length > 0 || cardFeatures.length > 0) && (
            <div className="space-y-4">
              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <p className="text-sm text-amber-800">
                  Este projeto possui <strong>{cards.length || cardFeatures.length} cards</strong> associados.
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
                    ⚠️ Os {cards.length || cardFeatures.length} cards serão permanentemente deletados e não poderão ser recuperados.
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
