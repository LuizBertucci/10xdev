import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent
} from "react"
import { Button } from "@/components/ui/button"
import { Check, Edit, GripVertical, Link2, Loader2, Sparkles, Trash2 } from "lucide-react"
import ContentRenderer from "./ContentRenderer"
import { Textarea } from "@/components/ui/textarea"
import type { CardFeature } from "@/types"
import { CardType } from "@/types/cardfeature"
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogBodyDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AIInstructions } from "@/components/AIInstructions"

interface CardFeatureModalProps {
  snippet: CardFeature | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (snippet: CardFeature) => void
  onDelete?: (snippetId: string) => void
  canGenerateSummary?: boolean
  isGeneratingSummary?: boolean
  onGenerateSummary?: (snippetId: string, prompt?: string) => void | Promise<void>
  onSaveSummary?: (snippetId: string, summaryContent: string) => void | Promise<void>
}

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
const SUMMARY_SCREEN_ID = '__summary__'
const DEFAULT_COLUMN_WIDTH = 500
const SUMMARY_COLUMN_WIDTH = 560
const MIN_COLUMN_WIDTH = 320
const MAX_COLUMN_WIDTH = 1200

type StoredModalLayout = {
  order: string[]
  widths: Record<string, number>
}

export default function CardFeatureModal({
  snippet,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canGenerateSummary = false,
  isGeneratingSummary = false,
  onGenerateSummary,
  onSaveSummary
}: CardFeatureModalProps) {
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false)
  const [summaryInstructions, setSummaryInstructions] = useState(SUMMARY_INSTRUCTIONS)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [apiLinkCopied, setApiLinkCopied] = useState(false)
  const [isEditingSummary, setIsEditingSummary] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState('')
  const [isSavingSummary, setIsSavingSummary] = useState(false)
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [draggingScreenId, setDraggingScreenId] = useState<string | null>(null)
  const [dragOverScreenId, setDragOverScreenId] = useState<string | null>(null)
  const resizeStateRef = useRef<{ screenId: string; startX: number; startWidth: number } | null>(null)

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

  const visibleScreens = useMemo(() => {
    if (!snippet) return []
    let summaryAlreadyAdded = false

    return snippet.screens.reduce<typeof snippet.screens>((acc, screen) => {
      if (isSummaryScreen(screen.name)) {
        if (summaryAlreadyAdded) return acc
        summaryAlreadyAdded = true
        acc.push({ ...screen, name: 'Visão Geral' })
        return acc
      }

      acc.push(screen)
      return acc
    }, [])
  }, [snippet])

  const getScreenStableId = (screen: CardFeature['screens'][number], index: number) => {
    if (isSummaryScreen(screen.name)) return SUMMARY_SCREEN_ID
    const firstRoute = (screen.blocks || [])
      .map((block) => block.route?.trim())
      .find((route): route is string => Boolean(route))
    if (firstRoute) return `route:${firstRoute}`
    const normalizedName = normalizeScreenName(screen.name) || 'sem-nome'
    return `screen:${normalizedName}:${index}`
  }

  const screenItems = useMemo(
    () =>
      visibleScreens.map((screen, index) => ({
        id: getScreenStableId(screen, index),
        isSummary: isSummaryScreen(screen.name),
        screen
      })),
    [visibleScreens]
  )

  const summaryScreenItem = useMemo(
    () => screenItems.find((item) => item.isSummary) ?? null,
    [screenItems]
  )

  const draggableScreenItems = useMemo(
    () => screenItems.filter((item) => !item.isSummary),
    [screenItems]
  )

  const orderedScreenItems = useMemo(() => {
    const draggableById = new Map(draggableScreenItems.map((item) => [item.id, item]))
    const currentDraggableIds = draggableScreenItems.map((item) => item.id)
    const normalizedOrder = columnOrder.filter((id) => draggableById.has(id))
    currentDraggableIds.forEach((id) => {
      if (!normalizedOrder.includes(id)) normalizedOrder.push(id)
    })
    const orderedDraggable = normalizedOrder
      .map((id) => draggableById.get(id))
      .filter((item): item is (typeof draggableScreenItems)[number] => Boolean(item))
    if (summaryScreenItem) return [summaryScreenItem, ...orderedDraggable]
    return orderedDraggable
  }, [columnOrder, draggableScreenItems, summaryScreenItem])

  const orderedDraggableScreenItems = useMemo(
    () => orderedScreenItems.filter((item) => !item.isSummary),
    [orderedScreenItems]
  )

  const getDefaultWidth = useCallback((screenId: string) => {
    return screenId === SUMMARY_SCREEN_ID ? SUMMARY_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH
  }, [])

  const clampColumnWidth = useCallback((width: number) => {
    return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width))
  }, [])

  const getColumnWidth = useCallback(
    (screenId: string) => {
      const storedWidth = columnWidths[screenId]
      if (!storedWidth) return getDefaultWidth(screenId)
      return clampColumnWidth(storedWidth)
    },
    [clampColumnWidth, columnWidths, getDefaultWidth]
  )

  const visibleFilesCount = useMemo(() => {
    const routes = new Set<string>()
    const screensForCount = visibleScreens.filter((screen) => !isSummaryScreen(screen.name))
    const isCountableFileRoute = (route: string) => {
      const normalized = route.toLowerCase()
      if (normalized.includes('/migrations/')) return false
      if (normalized.endsWith('.sql')) return false
      return true
    }

    screensForCount.forEach((screen) => {
      (screen.blocks || []).forEach((block) => {
        const route = block.route?.trim()
        if (route && isCountableFileRoute(route)) routes.add(route)
      })
    })
    return routes.size
  }, [visibleScreens])

  const getSummaryContent = (screen: CardFeature['screens'][number]) => {
    const textBlock = (screen.blocks || []).find((block) => block.type === 'text')
    return textBlock?.content || ''
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SUMMARY_INSTRUCTIONS_LS_KEY)
      if (stored) setSummaryInstructions(stored)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SUMMARY_INSTRUCTIONS_LS_KEY, summaryInstructions)
    } catch {
      // ignore
    }
  }, [summaryInstructions])

  useEffect(() => {
    if (!snippet) return
    const layoutStorageKey = `card-modal-layout:${snippet.id}`
    const draggableIds = draggableScreenItems.map((item) => item.id)
    const allScreenIds = screenItems.map((item) => item.id)
    const defaultWidths = allScreenIds.reduce<Record<string, number>>((acc, id) => {
      acc[id] = getDefaultWidth(id)
      return acc
    }, {})

    let parsedLayout: StoredModalLayout | null = null
    try {
      const stored = localStorage.getItem(layoutStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StoredModalLayout>
        if (Array.isArray(parsed.order) && parsed.widths && typeof parsed.widths === 'object') {
          parsedLayout = {
            order: parsed.order.filter((value): value is string => typeof value === 'string'),
            widths: Object.fromEntries(
              (Object.entries(parsed.widths).filter(
                ([, value]) => typeof value === 'number'
              ) as Array<[string, number]>)
            )
          }
        }
      }
    } catch {
      parsedLayout = null
    }

    const persistedOrder = parsedLayout?.order ?? []
    const normalizedOrder = persistedOrder.filter((id) => draggableIds.includes(id))
    draggableIds.forEach((id) => {
      if (!normalizedOrder.includes(id)) normalizedOrder.push(id)
    })

    const persistedWidths = parsedLayout?.widths ?? {}
    const normalizedWidths = { ...defaultWidths }
    allScreenIds.forEach((id) => {
      const maybeWidth = persistedWidths[id]
      if (typeof maybeWidth === 'number') {
        normalizedWidths[id] = clampColumnWidth(maybeWidth)
      }
    })

    setColumnOrder(normalizedOrder)
    setColumnWidths(normalizedWidths)
    setDraggingScreenId(null)
    setDragOverScreenId(null)
  }, [clampColumnWidth, draggableScreenItems, getDefaultWidth, screenItems, snippet])

  useEffect(() => {
    if (!snippet || !isOpen) return
    const layoutStorageKey = `card-modal-layout:${snippet.id}`
    const payload: StoredModalLayout = {
      order: columnOrder,
      widths: columnWidths
    }
    try {
      localStorage.setItem(layoutStorageKey, JSON.stringify(payload))
    } catch {
      // ignore
    }
  }, [columnOrder, columnWidths, isOpen, snippet])

  const onResizeMove = useCallback(
    (event: PointerEvent) => {
      const resizeState = resizeStateRef.current
      if (!resizeState) return
      const deltaX = event.clientX - resizeState.startX
      const nextWidth = clampColumnWidth(resizeState.startWidth + deltaX)
      setColumnWidths((prev) => ({
        ...prev,
        [resizeState.screenId]: nextWidth
      }))
    },
    [clampColumnWidth]
  )

  const stopResizing = useCallback(() => {
    resizeStateRef.current = null
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', stopResizing)
  }, [onResizeMove])

  const onResizeStart = useCallback(
    (screenId: string, event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      resizeStateRef.current = {
        screenId,
        startX: event.clientX,
        startWidth: getColumnWidth(screenId)
      }
      window.addEventListener('pointermove', onResizeMove)
      window.addEventListener('pointerup', stopResizing)
    },
    [getColumnWidth, onResizeMove, stopResizing]
  )

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onResizeMove)
      window.removeEventListener('pointerup', stopResizing)
    }
  }, [onResizeMove, stopResizing])

  const onScreenDragStart = useCallback(
    (screenId: string, event: ReactDragEvent<HTMLElement>) => {
      setDraggingScreenId(screenId)
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', screenId)
    },
    []
  )

  const onScreenDragOver = useCallback(
    (targetScreenId: string, event: ReactDragEvent<HTMLDivElement>) => {
      if (!draggingScreenId || draggingScreenId === targetScreenId) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setDragOverScreenId(targetScreenId)
    },
    [draggingScreenId]
  )

  const onScreenDrop = useCallback(
    (targetScreenId: string, event: ReactDragEvent<HTMLDivElement>) => {
      if (!draggingScreenId || draggingScreenId === targetScreenId) return
      event.preventDefault()
      setColumnOrder((prev) => {
        const current = prev.length > 0 ? [...prev] : draggableScreenItems.map((item) => item.id)
        const withoutDragged = current.filter((id) => id !== draggingScreenId)
        const targetIndex = withoutDragged.indexOf(targetScreenId)
        if (targetIndex < 0) return current
        withoutDragged.splice(targetIndex, 0, draggingScreenId)
        return withoutDragged
      })
      setDragOverScreenId(null)
      setDraggingScreenId(null)
    },
    [draggingScreenId, draggableScreenItems]
  )

  const onScreenDragEnd = useCallback(() => {
    setDraggingScreenId(null)
    setDragOverScreenId(null)
  }, [])

  const moveDraggedToIndex = useCallback(
    (targetIndex: number) => {
      if (!draggingScreenId) return
      setColumnOrder((prev) => {
        const current = prev.length > 0 ? [...prev] : draggableScreenItems.map((item) => item.id)
        const withoutDragged = current.filter((id) => id !== draggingScreenId)
        const clampedTargetIndex = Math.max(0, Math.min(targetIndex, withoutDragged.length))
        withoutDragged.splice(clampedTargetIndex, 0, draggingScreenId)
        return withoutDragged
      })
      setDragOverScreenId(null)
      setDraggingScreenId(null)
    },
    [draggingScreenId, draggableScreenItems]
  )

  const onGapDragOver = useCallback(
    (gapIndex: number, event: ReactDragEvent<HTMLDivElement>) => {
      if (!draggingScreenId) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setDragOverScreenId(`gap:${gapIndex}`)
    },
    [draggingScreenId]
  )

  const onGapDrop = useCallback(
    (gapIndex: number, event: ReactDragEvent<HTMLDivElement>) => {
      if (!draggingScreenId) return
      event.preventDefault()
      moveDraggedToIndex(gapIndex)
    },
    [draggingScreenId, moveDraggedToIndex]
  )

  if (!snippet) return null

  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const appBaseUrl = isLocalhost ? 'http://localhost:3000' : 'https://10xdev.com.br'
  const apiBaseUrl = isLocalhost ? 'http://localhost:3001/api' : 'https://api.10xdev.com.br/api'
  const cardShareUrl = `${appBaseUrl}/${snippet.card_type === CardType.POST ? 'contents' : 'codes'}/${snippet.id}`
  const cardApiUrl = `${apiBaseUrl}/card-features/${snippet.id}`

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(cardShareUrl)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleCopyApiUrl = async () => {
    try {
      await navigator.clipboard.writeText(cardApiUrl)
      setApiLinkCopied(true)
      setTimeout(() => setApiLinkCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <>
      <Dialog open={showSummaryPrompt} onOpenChange={setShowSummaryPrompt}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Instruções do resumo</DialogTitle>
            <DialogBodyDescription>
              Ajuste o prompt para gerar um resumo mais claro e focado na feature.
            </DialogBodyDescription>
          </DialogHeader>
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
            <AIInstructions
              value={summaryInstructions}
              onChange={setSummaryInstructions}
              rows={SUMMARY_INSTRUCTIONS_ROWS}
              label="Instruções para o resumo"
              id={`summary-instructions-modal-${snippet.id}`}
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
              onClick={async () => {
                setShowSummaryPrompt(false)
                if (onGenerateSummary && snippet) {
                  await onGenerateSummary(snippet.id, summaryInstructions)
                }
              }}
              disabled={isGeneratingSummary}
              className="h-9 px-4"
            >
              {isGeneratingSummary ? 'Gerando...' : 'Gerar resumo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-1 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-xl">{snippet.title}</DialogTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-7 px-2 text-xs ${shareLinkCopied ? 'text-green-600 border-green-300 bg-green-50' : 'text-gray-600 hover:text-blue-600 hover:border-blue-300'}`}
                    onClick={handleCopyShareUrl}
                  >
                    {shareLinkCopied ? <Check className="h-3 w-3 mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                    {shareLinkCopied ? 'Copiado!' : 'Compartilhar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-7 px-2 text-xs ${apiLinkCopied ? 'text-green-600 border-green-300 bg-green-50' : 'text-gray-600 hover:text-blue-600 hover:border-blue-300'}`}
                    onClick={handleCopyApiUrl}
                  >
                    {apiLinkCopied ? <Check className="h-3 w-3 mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                    {apiLinkCopied ? 'Copiado!' : 'Link para IA'}
                  </Button>
                  <span className="text-gray-400 text-sm">●</span>
                  <span className="text-sm font-medium text-gray-700">
                    {visibleFilesCount > 0
                      ? `${visibleFilesCount} ${visibleFilesCount === 1 ? 'arquivo' : 'arquivos'}`
                      : `${visibleScreens.filter((screen) => !isSummaryScreen(screen.name)).length} ${visibleScreens.filter((screen) => !isSummaryScreen(screen.name)).length === 1 ? 'aba' : 'abas'}`}
                  </span>
                </div>
              </div>
              {(onEdit || onDelete) && (
                <div className="flex gap-2 flex-shrink-0">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(snippet)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(snippet.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-6 pt-1 pb-6">
            <div className="flex h-full min-w-max">
              {orderedScreenItems.length === 0 ? (
                <div className="flex items-center justify-center w-full py-12 text-gray-500">
                  Nenhum conteúdo disponível
                </div>
              ) : (
                <>
                  {orderedScreenItems.map(({ id, isSummary, screen }) => (
                    <Fragment key={id}>
                      {!isSummary && (
                        <div
                          className={`relative h-full w-6 flex-shrink-0 ${
                            dragOverScreenId === `gap:${orderedDraggableScreenItems.findIndex((item) => item.id === id)}`
                              ? 'bg-blue-100/80'
                              : ''
                          }`}
                          onDragOver={(event) => {
                            const gapIndex = orderedDraggableScreenItems.findIndex((item) => item.id === id)
                            if (gapIndex < 0) return
                            onGapDragOver(gapIndex, event)
                          }}
                          onDrop={(event) => {
                            const gapIndex = orderedDraggableScreenItems.findIndex((item) => item.id === id)
                            if (gapIndex < 0) return
                            onGapDrop(gapIndex, event)
                          }}
                        />
                      )}
                      <div
                        className={`relative flex-shrink-0 h-full min-h-0 flex flex-col ${
                          draggingScreenId === id ? 'opacity-70' : ''
                        } ${dragOverScreenId === id ? 'ring-1 ring-blue-300 rounded-lg' : ''}`}
                        style={{ width: `${getColumnWidth(id)}px`, minWidth: `${MIN_COLUMN_WIDTH}px` }}
                        onDragOver={(event) => {
                          if (isSummary) return
                          onScreenDragOver(id, event)
                        }}
                        onDrop={(event) => {
                          if (isSummary) return
                          onScreenDrop(id, event)
                        }}
                      >
                        <div className="relative h-full min-h-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
                          {!isSummary && (
                            <div className="absolute left-3 top-3 z-10">
                              <button
                                type="button"
                                draggable
                                onDragStart={(event) => onScreenDragStart(id, event)}
                                onDragEnd={onScreenDragEnd}
                                className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 active:cursor-grabbing"
                                title="Arrastar coluna"
                                aria-label="Arrastar coluna"
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                          {isSummary && onGenerateSummary && canGenerateSummary && (
                            <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowSummaryPrompt(true)}
                                disabled={isGeneratingSummary || isEditingSummary || isSavingSummary}
                                className="h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
                                title={isGeneratingSummary ? "Gerando resumo..." : "Gerar resumo com IA"}
                              >
                                {isGeneratingSummary ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                              </Button>
                              {onSaveSummary && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSummaryDraft(getSummaryContent(screen))
                                    setIsEditingSummary(true)
                                  }}
                                  disabled={isGeneratingSummary || isSavingSummary}
                                  className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                  title="Editar Visão Geral"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                          {isSummary && isEditingSummary && onSaveSummary ? (
                            <div className="flex h-full min-h-0 flex-col pt-10">
                              <Textarea
                                value={summaryDraft}
                                onChange={(event) => setSummaryDraft(event.target.value)}
                                spellCheck={false}
                                className="flex-1 min-h-[280px] text-xs leading-relaxed resize-none"
                                placeholder="Edite a Visão Geral em markdown..."
                              />
                              <div className="mt-3 flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setIsEditingSummary(false)
                                    setSummaryDraft('')
                                  }}
                                  disabled={isSavingSummary}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={async () => {
                                    if (!snippet) return
                                    try {
                                      setIsSavingSummary(true)
                                      await onSaveSummary(snippet.id, summaryDraft)
                                      setIsEditingSummary(false)
                                    } finally {
                                      setIsSavingSummary(false)
                                    }
                                  }}
                                  disabled={isSavingSummary}
                                >
                                  {isSavingSummary ? 'Salvando...' : 'Salvar'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <ContentRenderer blocks={screen.blocks || []} />
                          )}
                        </div>
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label="Redimensionar coluna"
                          className="absolute -right-2 top-3 z-20 h-7 w-2 cursor-col-resize rounded-md bg-transparent hover:bg-blue-300/60"
                          onPointerDown={(event) => onResizeStart(id, event)}
                        />
                      </div>
                    </Fragment>
                  ))}
                  {orderedDraggableScreenItems.length > 0 && (
                    <div
                      className={`relative h-full w-6 flex-shrink-0 ${
                        dragOverScreenId === `gap:${orderedDraggableScreenItems.length}` ? 'bg-blue-100/80' : ''
                      }`}
                      onDragOver={(event) => onGapDragOver(orderedDraggableScreenItems.length, event)}
                      onDrop={(event) => onGapDrop(orderedDraggableScreenItems.length, event)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
