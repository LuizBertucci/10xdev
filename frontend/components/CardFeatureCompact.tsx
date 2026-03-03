import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit, Trash2, MoreVertical, Link2, Check, Globe, ExternalLink, FileText, Video, Sparkles, Loader2, Expand, ArrowRight, Bot } from "lucide-react"
import { VisibilityTab } from "./VisibilityTab"
import { toast } from "sonner"
import { getTechConfig, getLanguageConfig } from "./utils/techConfigs"
import ContentRenderer from "./ContentRenderer"
import DiffViewer from "./DiffViewer"
import { useAuth } from "@/hooks/useAuth"
import { useCardTabState } from "@/hooks/useCardTabState"
import { cardFeatureService } from "@/services/cardFeatureService"
import type { CardFeature as CardFeatureType } from "@/types"
import type { CommitFile } from "@/services"
import { ContentType, Visibility, CardType } from "@/types"
import { AIInstructions } from "@/components/AIInstructions"

const SUMMARY_INSTRUCTIONS = [
  '## Regras de Negócio (clareza do resumo)',
  '- Explique a feature em linguagem simples, sem jargões',
  '- Título e descrição devem comunicar o problema que resolve e o benefício gerado',
  '- Não use nomes de arquivos/componentes no texto',
  '- Pense em quem usa a feature e qual fluxo principal ela habilita',
  '',
  '## Diretrizes do Resumo',
  '- Mantenha o formato atual (título, descrição, categoria/tecnologias, features, arquivos)',
  '- A descrição curta deve ser objetiva e fácil de entender por qualquer pessoa',
  '- As features devem refletir capacidades reais do card, sem detalhes de implementação'
].join('\n')

const SUMMARY_INSTRUCTIONS_ROWS = SUMMARY_INSTRUCTIONS.split('\n').length + 4
const SUMMARY_INSTRUCTIONS_LS_KEY = 'card-summary-instructions'

interface CardFeatureCompactProps {
  snippet: CardFeatureType
  onEdit: (snippet: CardFeatureType) => void
  onDelete: (snippetId: string) => void
  onUpdate?: (id: string, data: Partial<CardFeatureType>) => Promise<void>
  className?: string
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  expandOnClick?: boolean
  onExpand?: (snippet: CardFeatureType) => void
  canEdit?: boolean
  defaultExpanded?: boolean
  hideVisibility?: boolean
  commitFiles?: CommitFile[]
}

export default function CardFeatureCompact({ snippet, onEdit, onDelete, onUpdate, className, isSelectionMode = false, isSelected = false, onToggleSelect, expandOnClick = false, onExpand, canEdit: canEditOverride, defaultExpanded, hideVisibility, commitFiles }: CardFeatureCompactProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCardIdFromUrl = searchParams?.get('id')
  const { user } = useAuth()
  // Estado para controlar se o código está expandido
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false)
  // Estado para controlar a aba ativa - persiste na URL
  const { activeTab, setActiveTab } = useCardTabState(snippet.id)
  // Estado para feedback de "copiado"
  const [apiLinkCopied, setApiLinkCopied] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [contentLinkCopied, setContentLinkCopied] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false)
  const [summaryInstructions, setSummaryInstructions] = useState(SUMMARY_INSTRUCTIONS)
  // Estado local para screens - permite atualização imediata após gerar resumo
  const [localScreens, setLocalScreens] = useState(snippet.screens)
  
  const canEdit = canEditOverride ?? (user?.role === 'admin' || (!!user?.id && snippet.createdBy === user.id))
  
  // URL da API baseada no ambiente
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:3001/api'
    : 'https://api.10xdev.com.br/api'
  const cardApiUrl = `${apiBaseUrl}/card-features/${snippet.id}`
  
  // URL de compartilhamento (link amigável)
  const appBaseUrl = isLocalhost
    ? 'http://localhost:3000'
    : 'https://10xdev.com.br'
  const cardShareUrl = `${appBaseUrl}/${snippet.card_type === CardType.POST ? 'contents' : 'codes'}/${snippet.id}`

  // Cálculo local de acesso (evita chamada individual GET /access por card)
  const accessInfo = useMemo(() => {
    if (!user) return null
    return {
      canGenerate: user.role === 'admin',
      isOwner: snippet.createdBy === user.id,
      isAdmin: user.role === 'admin'
    }
  }, [user, snippet.createdBy])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SUMMARY_INSTRUCTIONS_LS_KEY)
      if (stored) setSummaryInstructions(stored)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SUMMARY_INSTRUCTIONS_LS_KEY, summaryInstructions)
    } catch { /* ignore */ }
  }, [summaryInstructions])

  // Retorna o CommitFile correspondente a uma screen (via screen.route ou block.route)
  const getCommitFileForScreen = (screen: CardFeatureType['screens'][0]) => {
    if (!commitFiles?.length) return undefined
    if (screen.route) {
      const match = commitFiles.find(f => f.filename === screen.route)
      if (match) return match
    }
    for (const block of screen.blocks || []) {
      if (block.route) {
        const match = commitFiles.find(f => f.filename === block.route)
        if (match) return match
      }
    }
    return undefined
  }

  // Função para alternar o estado de expansão
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const youtubeBlockUrl =
    localScreens
      ?.flatMap((screen) => screen.blocks || [])
      .find((block) => block.type === ContentType.YOUTUBE && block.content)?.content || ""

  const pdfBlockUrl =
    localScreens
      ?.flatMap((screen) => screen.blocks || [])
      .find((block) => block.type === ContentType.PDF && block.content)?.content || ""

  const resolvedYoutubeUrl = snippet.youtubeUrl || youtubeBlockUrl
  const resolvedPdfUrl = snippet.fileUrl || pdfBlockUrl
  const hasFile = Boolean(resolvedPdfUrl)
  const hasVideo = Boolean(resolvedYoutubeUrl)
  const contentLink = resolvedPdfUrl || resolvedYoutubeUrl

  // Função para copiar URL da API
  const handleCopyApiUrl = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(cardApiUrl)
      setApiLinkCopied(true)
      toast.success("Link da API copiado!")
      setTimeout(() => setApiLinkCopied(false), 2000)
    } catch {
      toast.error("Erro ao copiar link")
    }
  }

  // Função para copiar URL de compartilhamento
  const handleCopyShareUrl = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(cardShareUrl)
      setShareLinkCopied(true)
      toast.success("Link copiado!")
      setTimeout(() => setShareLinkCopied(false), 2000)
    } catch {
      toast.error("Erro ao copiar link")
    }
  }

  const handleCopyContentUrl = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!contentLink) return
    try {
      await navigator.clipboard.writeText(contentLink)
      setContentLinkCopied(true)
      toast.success("Link do conteúdo copiado!")
      setTimeout(() => setContentLinkCopied(false), 2000)
    } catch {
      toast.error("Erro ao copiar link do conteúdo")
    }
  }

  // Função para lidar com cliques no card
  const handleCardClick = (e: React.MouseEvent) => {
    // Previne a navegação se clicou em um botão
    if ((e.target as HTMLElement).closest('button')) {
      return
    }

    if (expandOnClick) {
      toggleExpanded()
      return
    }

    // Navegar para view de detalhe baseado no tipo de card
    const route = snippet.card_type === CardType.POST ? `/contents/${snippet.id}` : `/codes/${snippet.id}`
    router.push(route)
  }

  const normalizeScreenName = (name?: string) =>
    (name || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const isSummaryScreen = (name?: string) => {
    const normalized = normalizeScreenName(name)
    return normalized === 'resumo' || normalized === 'visao geral'
  }

  const visibleScreens = useMemo(() => {
    let summaryAlreadyAdded = false

    return localScreens.reduce<CardFeatureType['screens']>((acc, screen) => {
      if (isSummaryScreen(screen.name)) {
        if (summaryAlreadyAdded) return acc
        summaryAlreadyAdded = true
        acc.push({ ...screen, name: 'Visão Geral' })
        return acc
      }

      acc.push(screen)
      return acc
    }, [])
  }, [localScreens])

  // Screen ativa baseada na tab selecionada
  const activeScreen = visibleScreens[activeTab] || visibleScreens[0]
  const isSummaryTab = isSummaryScreen(activeScreen?.name)

  // Função para mudar visibilidade rapidamente
  const handleVisibilityChange = async (newVisibility: Visibility) => {
    if (!onUpdate || !canEdit) return
    
    try {
      await onUpdate(snippet.id, { visibility: newVisibility })
      toast.success(`Visibilidade alterada para ${
        newVisibility === Visibility.PUBLIC ? 'Validando' :
        newVisibility === Visibility.UNLISTED ? 'Seu Espaço' : 'Público'
      }`)
    } catch {
      toast.error("Erro ao alterar visibilidade")
    }
  }

  const handleGenerateSummary = useCallback(async (prompt?: string) => {
    if (!accessInfo?.canGenerate || isGeneratingSummary) return
    setIsGeneratingSummary(true)
    try {
      const response = await cardFeatureService.generateSummary(
        snippet.id,
        true,
        prompt?.trim() || undefined
      )
      if (response.success) {
        const updatedScreens = response.summary
          ? [
              {
                name: 'Visão Geral',
                description: 'Resumo gerado por IA',
                blocks: [{ id: cardFeatureService.generateUUID(), type: ContentType.TEXT, content: response.summary, order: 0 }],
                route: ''
              },
              ...localScreens.filter((s) => !isSummaryScreen(s.name))
            ]
          : localScreens
        if (onUpdate) {
          await onUpdate(snippet.id, { screens: updatedScreens })
          setLocalScreens(updatedScreens)
          const summaryIndex = updatedScreens.findIndex((screen) =>
            isSummaryScreen(screen.name)
          )
          if (summaryIndex >= 0) {
            setActiveTab(summaryIndex)
          }
          toast.success('Resumo gerado com sucesso!')
        }
      } else {
        toast.error(response.message || 'Erro ao gerar resumo')
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message) {
        toast.error(error.message)
      } else {
        toast.error('Erro ao gerar resumo')
      }
    } finally {
      setIsGeneratingSummary(false)
    }
  }, [accessInfo, isGeneratingSummary, snippet, currentCardIdFromUrl, onUpdate, router, localScreens])

  const VisibilityDropdown = ({ size = 'default' }: { size?: 'default' | 'small' }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <VisibilityTab 
          visibility={snippet.visibility} 
          isPrivate={snippet.isPrivate} 
          approvalStatus={(snippet as { approvalStatus?: unknown }).approvalStatus as 'approved' | 'rejected' | 'pending' | 'none' | undefined}
          size={size} 
          isClickable={canEdit}
        />
      </DropdownMenuTrigger>
      {canEdit && (
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => handleVisibilityChange(Visibility.PUBLIC)} className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-600" />
            <span>Enviar para validação</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleVisibilityChange(Visibility.UNLISTED)} className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            <span>Seu Espaço</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )

  return (
    <TooltipProvider>
      <Dialog open={showSummaryPrompt} onOpenChange={setShowSummaryPrompt}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Instruções do resumo</DialogTitle>
            <DialogDescription>
              Ajuste o prompt para gerar um resumo mais claro e focado na feature.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
            <AIInstructions
              value={summaryInstructions}
              onChange={setSummaryInstructions}
              rows={SUMMARY_INSTRUCTIONS_ROWS}
              label="Instruções para o resumo"
              id={`summary-instructions-${snippet.id}`}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSummaryPrompt(false)}
              disabled={isGeneratingSummary}
              className="h-9 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowSummaryPrompt(false)
                handleGenerateSummary(summaryInstructions)
              }}
              disabled={isGeneratingSummary}
              className="h-9 px-4"
            >
              {isGeneratingSummary ? 'Gerando...' : 'Gerar resumo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className={`shadow-sm hover:shadow-md transition-shadow w-full min-w-0 overflow-hidden ${!isExpanded ? 'min-h-[9.5rem]' : ''} ${isSelected ? 'ring-2 ring-blue-500' : ''} ${className || ''}`}>
        <CardContent className="p-3 md:p-4 min-w-0">
          {/* Layout Unificado - Vertical para mobile e desktop */}
          <div
            className="cursor-pointer active:bg-gray-50 rounded-lg transition-colors"
            onClick={handleCardClick}
          >
            <div className="space-y-2">
              {/* Título com Checkbox e Menu */}
              <div className="flex items-start justify-between gap-2">
                {/* Checkbox de seleção (modo seleção) */}
                {isSelectionMode && onToggleSelect && (
                  <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(snippet.id)}
                      className="h-5 w-5 min-h-[44px] sm:min-h-0 touch-manipulation"
                    />
                  </div>
                )}
                
                <h3 className="font-semibold text-gray-900 leading-snug break-words flex-1 min-h-[2.5rem]">
                  {snippet.title}
                </h3>
                
                {/* Menu ⋮ - Na altura do título (oculto em modo seleção) */}
                {!isSelectionMode && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(snippet)
                          }}
                          disabled={!canEdit}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(snippet.id)
                          }}
                          className="text-red-600"
                          disabled={!canEdit}
                        >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 min-h-[1.25rem]">
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border border-gray-300 bg-gray-50 text-gray-700"
                >
                  <span className="mr-1">👤</span>
                  {snippet.author || (snippet.createdBy ? 'Usuário' : 'Anônimo')}
                </Badge>
                <span className="text-gray-400 text-[8px]">●</span>
                {snippet.tech && (
                  <Badge
                    className={`text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border ${getTechConfig(snippet.tech).color}`}
                  >
                    <span className="mr-1">{getTechConfig(snippet.tech).icon}</span>
                    {snippet.tech}
                  </Badge>
                )}
                {snippet.language && (!snippet.tech || snippet.language.toLowerCase() !== snippet.tech.toLowerCase()) && (
                  <Badge
                    className={`text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border ${getLanguageConfig(snippet.language).color}`}
                  >
                    <span className="mr-1 text-[10px] font-bold">{getLanguageConfig(snippet.language).icon}</span>
                    {snippet.language}
                  </Badge>
                )}
                {hasFile && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border border-red-200 bg-red-50 text-red-700">
                    <FileText className="h-3 w-3 mr-1" />
                    PDF
                  </Badge>
                )}
                {hasVideo && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border border-red-200 bg-red-50 text-red-700">
                    <Video className="h-3 w-3 mr-1" />
                    Vídeo
                  </Badge>
                )}
                {visibleScreens.some((s) => isSummaryScreen(s.name)) && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border border-blue-200 bg-blue-50 text-blue-700">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Visão Geral
                  </Badge>
                )}
              </div>
              
              {/* Linha separatória */}
              <div className="border-t border-gray-200 pt-2">
                {/* Ícones em linha horizontal - alinhados à direita */}
                <div className="flex items-center justify-between gap-2">
                  {/* Badge de Visibilidade (Lado Esquerdo) */}
                  {!hideVisibility && (
                    <div className="flex-shrink-0">
                      <VisibilityDropdown size="small" />
                    </div>
                  )}

                  <div className="flex items-center gap-6 ml-auto">
                    {hasFile && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs text-gray-600 hover:text-blue-600 hover:border-blue-300"
                        asChild
                      >
                        <a href={resolvedPdfUrl!} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir PDF
                        </a>
                      </Button>
                    )}
                    {hasVideo && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs text-gray-600 hover:text-blue-600 hover:border-blue-300"
                        asChild
                      >
                        <a href={resolvedYoutubeUrl!} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver Vídeo
                        </a>
                      </Button>
                    )}
                    {contentLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-7 px-2 text-xs ${contentLinkCopied ? 'text-green-600 border-green-300 bg-green-50' : 'text-gray-600 hover:text-blue-600 hover:border-blue-300'}`}
                        onClick={handleCopyContentUrl}
                      >
                        {contentLinkCopied ? <Check className="h-3 w-3 mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                        {contentLinkCopied ? 'Copiado!' : 'Link do arquivo'}
                      </Button>
                    )}

                    {/* Botão Link para IA */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-7 px-2 text-xs ${apiLinkCopied ? 'text-green-600 border-green-300 bg-green-50' : 'text-gray-600 hover:text-blue-600 hover:border-blue-300'}`}
                      onClick={handleCopyApiUrl}
                    >
                      {apiLinkCopied ? <Check className="h-3 w-3 mr-1" /> : <Bot className="h-3 w-3 mr-1" />}
                      {apiLinkCopied ? 'Copiado!' : 'Link para IA'}
                    </Button>

                    {/* Botão Compartilhar */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyShareUrl(e)
                          }}
                          className="h-5 w-5 inline-flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          {shareLinkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent><p>{shareLinkCopied ? 'Copiado!' : 'Compartilhar'}</p></TooltipContent>
                    </Tooltip>

                    {/* Ícone Tela cheia — sem borda */}
                    {onExpand && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onExpand(snippet)
                            }}
                            className="hidden md:inline-flex h-5 w-5 items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Expand className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p>Tela cheia</p></TooltipContent>
                      </Tooltip>
                    )}

                    {/* Ícone Acessar — oculto quando onExpand existe (contexto de projeto) */}
                    {!onExpand && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/${snippet.card_type === CardType.POST ? 'contents' : 'codes'}/${snippet.id}`)
                            }}
                            className="h-5 w-5 inline-flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p>Acessar</p></TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Área de Código Condicional */}
          {isExpanded && (
            <div className="mt-2 md:mt-3 space-y-1.5 animate-in slide-in-from-top-2 duration-300 overflow-x-hidden min-w-0">
              {/* Sistema de Tabs */}
              <div className="compact-tabs-scroll flex gap-1.5 p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-md overflow-x-auto overflow-y-hidden w-full">
                <style>{`
                  .compact-tabs-scroll::-webkit-scrollbar {
                    height: 6px;
                  }
                  .compact-tabs-scroll::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                  }
                  .compact-tabs-scroll::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 3px;
                  }
                  .compact-tabs-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.5);
                  }
                `}</style>
                {visibleScreens.map((screen, index) => {
                  const hasDiff = !!getCommitFileForScreen(screen)
                  return (
                    <button
                      key={index}
                      onClick={() => setActiveTab(index)}
                      className={`
                        px-4 py-2 text-xs font-medium transition-all duration-300 rounded-lg relative flex-shrink-0 whitespace-nowrap inline-flex items-center gap-1
                        ${activeTab === index
                          ? 'text-gray-700 bg-white shadow-md transform scale-105 font-semibold'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:shadow-sm hover:-translate-y-0.5'
                        }
                      `}
                    >
                      {screen.name || `Aba ${index + 1}`}
                      {hasDiff && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Área do Conteúdo com Containers Específicos */}
              <div className="rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 px-2 md:px-3 pt-3 md:pt-4 pb-2 md:pb-3 relative group bg-white w-full min-w-0 overflow-hidden">
                {/* Botão Gerar Resumo - apenas na aba Resumo */}
                {isSummaryTab && accessInfo?.canGenerate && (
                  <div className="absolute top-2 right-2 z-20">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowSummaryPrompt(true)
                          }}
                          disabled={isGeneratingSummary}
                          className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        >
                          {isGeneratingSummary ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isGeneratingSummary ? 'Gerando resumo...' : 'Gerar resumo com IA'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {isGeneratingSummary && isSummaryTab && (
                  <div className="mb-2 w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                )}
                <style>{`
                  .codeblock-scroll::-webkit-scrollbar {
                    height: 8px;
                  }
                  .codeblock-scroll::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                  }
                  .codeblock-scroll::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                  }
                  .codeblock-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.5);
                  }
                  .compact-content .youtube-container {
                    max-width: 520px;
                    margin-left: 0;
                    margin-right: 0;
                    border: none;
                    box-shadow: none;
                    background: transparent;
                    padding: 0;
                  }
                  @media (max-width: 640px) {
                    .compact-content .youtube-container {
                      max-width: 100%;
                    }
                  }
                 `}</style>

                <div className="codeblock-scroll relative z-10 overflow-x-auto overflow-y-visible mx-0 px-0 pt-0 w-full max-w-full min-w-0">
                  {activeScreen ? (
                    (() => {
                      const screenDiffFile = getCommitFileForScreen(activeScreen)
                      if (screenDiffFile) {
                        return <DiffViewer files={[screenDiffFile]} />
                      }
                      return (
                        <ContentRenderer
                          blocks={activeScreen.blocks || []}
                          className="h-full compact-content w-full"
                          key={`${activeScreen.name}-${activeScreen.blocks?.length || 0}`}
                        />
                      )
                    })()
                  ) : (
                    <p className="text-sm text-gray-500 px-1 py-2">Nenhum conteúdo disponível</p>
                  )}
                  {isSummaryTab && snippet.newsletterUrl && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <a
                        href={snippet.newsletterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Fonte original: {snippet.newsletterUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </TooltipProvider>
  )
}