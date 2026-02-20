"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Columns, ExternalLink, LayoutTemplate, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase'
import {
  type ActiveImportRef,
  type ImportJob,
  IMPORT_JOB_LS_KEY,
  IMPORT_MODAL_CHANGE_EVENT,
  IMPORT_MODAL_OPEN_KEY,
  defaultMessage,
  safeParse,
} from '@/lib/importJobUtils'
import FileTreeView from '@/components/FileTreeView'

interface ModalCard {
  id: string
  title: string
  category?: string
  screensCount: number
}

type ModalMode = 'modal' | 'panel'

const MODAL_MODE_KEY = 'importModalMode'

const REASON_LABELS: Record<string, string> = {
  ignored_dir: 'Diretórios ignorados',
  ignored_file: 'Arquivos de configuração',
  invalid_extension: 'Extensões não suportadas',
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function parseTokenUsage(message: string | null): { prompt: number; completion: number; messageWithoutTokens: string } | null {
  if (!message) return null
  // "Importação concluída. Tokens: 482454 prompt + 1966 completion = 484420 total"
  const m1 = message.match(/Tokens:\s*(\d+)\s*prompt\s*\+\s*(\d+)\s*completion/)
  if (m1) {
    return {
      prompt: parseInt(m1[1]!, 10),
      completion: parseInt(m1[2]!, 10),
      messageWithoutTokens: message.replace(/\s*Tokens:.*$/, '').trim() || 'Importação concluída.'
    }
  }
  // "(482454 + 1966 tokens)" durante progresso
  const m2 = message.match(/\((\d+)\s*\+\s*(\d+)\s*tokens\)/)
  if (m2) {
    return {
      prompt: parseInt(m2[1]!, 10),
      completion: parseInt(m2[2]!, 10),
      messageWithoutTokens: message.replace(/\s*\(\d+\s*\+\s*\d+\s*tokens\)$/, '').trim()
    }
  }
  return null
}

export default function ImportProgressModal() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => { try { return createClient() } catch { return null } }, [])

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ModalMode>('modal')
  const [active, setActive] = useState<ActiveImportRef | null>(null)
  const [job, setJob] = useState<ImportJob | null>(null)
  const [cards, setCards] = useState<ModalCard[]>([])
  const [fileReportOpen, setFileReportOpen] = useState(true)
  const [includedOpen, setIncludedOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(true)
  const logEndRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  const progressLog = job?.progress_log ?? []
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [progressLog.length])

  const isAiAnalyzing = job?.step === 'ai_analyzing' && job?.status === 'running'
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  useEffect(() => {
    if (!isAiAnalyzing) { setElapsedSeconds(0); return }
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isAiAnalyzing])

  const handleClearAll = useCallback(() => {
    setActive(null)
    setJob(null)
    setCards([])
    try {
      localStorage.removeItem(IMPORT_JOB_LS_KEY)
      localStorage.setItem(IMPORT_MODAL_OPEN_KEY, 'false')
      window.dispatchEvent(new CustomEvent(IMPORT_MODAL_CHANGE_EVENT))
    } catch { /* ignore */ }
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    try {
      localStorage.setItem(IMPORT_MODAL_OPEN_KEY, 'false')
      window.dispatchEvent(new CustomEvent(IMPORT_MODAL_CHANGE_EVENT))
    } catch { /* ignore */ }
  }, [])

  // Init from localStorage + listen for change events
  useEffect(() => {
    mountedRef.current = true

    const syncFromStorage = () => {
      try {
        const saved = safeParse(localStorage.getItem(IMPORT_JOB_LS_KEY))
        setActive(saved?.jobId && saved?.projectId ? saved : null)
        setOpen(localStorage.getItem(IMPORT_MODAL_OPEN_KEY) === 'true')
      } catch { /* ignore */ }
    }

    syncFromStorage()

    try {
      const savedMode = localStorage.getItem(MODAL_MODE_KEY) as ModalMode | null
      if (savedMode === 'panel' || savedMode === 'modal') setMode(savedMode)
    } catch { /* ignore */ }

    window.addEventListener(IMPORT_MODAL_CHANGE_EVENT, syncFromStorage)
    return () => {
      mountedRef.current = false
      window.removeEventListener(IMPORT_MODAL_CHANGE_EVENT, syncFromStorage)
    }
  }, [])

  // Erro de importação é exibido na UI do modal; não logar no console para evitar ruído

  // Re-sync after navigation (router.push can happen before React commits state updates)
  useEffect(() => {
    try {
      const saved = safeParse(localStorage.getItem(IMPORT_JOB_LS_KEY))
      setActive(saved?.jobId && saved?.projectId ? saved : null)
      setOpen(localStorage.getItem(IMPORT_MODAL_OPEN_KEY) === 'true')
    } catch { /* ignore */ }
  }, [pathname])

  // Subscribe to import_jobs realtime
  useEffect(() => {
    if (!supabase || !active?.jobId) return
    let mounted = true

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('import_jobs').select('*').eq('id', active.jobId).maybeSingle()
      if (!mounted) return
      if (error || !data) { handleClearAll(); return }
      setJob(data as ImportJob)
    }
    fetchInitial()

    const channel = supabase
      .channel(`import_prog_modal:${active.jobId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'import_jobs', filter: `id=eq.${active.jobId}` }, (payload) => {
        if ((payload as { eventType?: string }).eventType === 'DELETE') { handleClearAll(); return }
        const row = (payload as { new?: ImportJob })?.new
        if (!row) return
        setJob(row)
      })
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [supabase, active?.jobId, handleClearAll])

  // Subscribe to project_cards inserts for streaming cards
  useEffect(() => {
    if (!supabase || !active?.projectId || !open) return
    let mounted = true
    setCards([])

    const fetchExistingCards = async () => {
      const { data: links } = await supabase
        .from('project_cards')
        .select('card_feature_id')
        .eq('project_id', active.projectId)
        .order('created_at', { ascending: true })

      if (!mounted || !links || links.length === 0) return

      const ids = (links as { card_feature_id: string }[]).map(l => l.card_feature_id)
      const { data: cardsData } = await supabase
        .from('card_features')
        .select('id, title, category, screens')
        .in('id', ids)

      if (!mounted || !cardsData) return
      setCards((cardsData as { id: string; title: string; category?: string; screens?: unknown[] }[]).map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        screensCount: Array.isArray(c.screens) ? c.screens.length : 0
      })))
    }
    fetchExistingCards()

    const channel = supabase
      .channel(`import_prog_cards:${active.projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_cards', filter: `project_id=eq.${active.projectId}` }, async (payload) => {
        const row = (payload as { new?: Record<string, unknown> })?.new
        const cardFeatureId = row?.card_feature_id as string | undefined
        if (!cardFeatureId || !mounted) return
        const { data: cardData } = await supabase
          .from('card_features').select('id, title, category, screens').eq('id', cardFeatureId).maybeSingle()
        if (!mounted || !cardData) return
        const c = cardData as { id: string; title: string; category?: string; screens?: unknown[] }
        setCards(prev => prev.some(x => x.id === c.id) ? prev : [...prev, {
          id: c.id, title: c.title, category: c.category,
          screensCount: Array.isArray(c.screens) ? c.screens.length : 0
        }])
      })
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [supabase, active?.projectId, open])

  const handleToggleMode = () => {
    const next: ModalMode = mode === 'modal' ? 'panel' : 'modal'
    setMode(next)
    try { localStorage.setItem(MODAL_MODE_KEY, next) } catch { /* ignore */ }
  }

  const handleOpenProject = () => {
    if (!active?.projectId) return
    router.push(`/projects/${active.projectId}`)
    handleClose()
  }

  const cardsByCategory = useMemo(() => {
    const groups: Record<string, ModalCard[]> = {}
    for (const card of cards) {
      const key = card.category || 'Sem categoria'
      if (!groups[key]) groups[key] = []
      groups[key]!.push(card)
    }
    const entries = Object.entries(groups)
    const semCat = entries.find(([k]) => k === 'Sem categoria')
    if (semCat) {
      return Object.fromEntries([...entries.filter(([k]) => k !== 'Sem categoria'), semCat])
    }
    return groups
  }, [cards])

  const fileReport = useMemo(() => {
    if (!job?.file_report_json) return null
    const groups: Record<string, string[]> = {}
    for (const item of job.file_report_json.ignored) {
      if (!groups[item.reason]) groups[item.reason] = []
      groups[item.reason]!.push(item.path)
    }
    return { total: job.file_report_json.ignored.length, groups, included: job.file_report_json.included ?? [] }
  }, [job?.file_report_json])

  if (!open || !active?.jobId) return null

  const progress = Math.max(0, Math.min(100, Number(job?.progress ?? 0)))
  const rawMessage = job?.message || defaultMessage(job?.step || 'starting')
  const tokenUsage = parseTokenUsage(job?.message ?? null)
  const message = tokenUsage?.messageWithoutTokens ?? rawMessage
  const isGenerating = job?.step === 'generating_cards' || job?.step === 'creating_cards'
  const isDone = job?.status === 'done'
  const isError = job?.status === 'error'
  const statusTitle = isDone ? 'Importação concluída' : isError ? 'Erro na importação' : 'Importando...'

  const content = (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
        <p className="text-xs font-semibold text-gray-900">{statusTitle}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleMode}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            title={mode === 'modal' ? 'Modo painel lateral' : 'Modo modal'}
          >
            {mode === 'modal' ? <Columns className="h-4 w-4" /> : <LayoutTemplate className="h-4 w-4" />}
          </button>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 p-1 rounded" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Erro — exibir primeiro quando houver */}
      {isError && job?.error && (
        <div className="px-4 py-3 border-b flex-shrink-0 bg-red-50 border-l-4 border-red-500">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600 mb-1">Motivo do erro</p>
          <p className="text-xs text-red-800 break-words whitespace-pre-wrap">{job.error}</p>
        </div>
      )}

      {/* Progress */}
      <div className="px-4 py-3 border-b flex-shrink-0">
        <Progress value={progress} className={isAiAnalyzing ? 'h-2 animate-pulse' : 'h-2'} />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-gray-600 truncate max-w-[220px]">{message}</p>
          <span className="text-[11px] font-semibold text-blue-700 ml-2">{progress}%</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
          <span>📁 {job?.file_report_json?.included?.length ?? job?.files_processed ?? 0} arquivos</span>
          <span>🗂️ {job?.cards_created ?? 0} cards</span>
          {job?.ai_requested && (
            <span className={job?.ai_used ? 'text-green-600' : 'text-blue-500'}>
              {job?.ai_used ? `🤖 IA: ${job?.ai_cards_created ?? 0}` : '🤖 IA: gerando...'}
            </span>
          )}
          {tokenUsage && (
            <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">
              <span>{formatTokens(tokenUsage.prompt)} prompt</span>
              <span className="text-blue-400">·</span>
              <span>{formatTokens(tokenUsage.completion)} saída</span>
            </span>
          )}
        </div>
      </div>

      {/* Log do progresso (streaming) */}
      {progressLog.length > 0 && (
        <div className="border-t flex-shrink-0">
          <button
            onClick={() => setLogOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-[11px] text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span>Log ({progressLog.length})</span>
            {logOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {logOpen && (
            <div className="px-4 pb-3 max-h-32 overflow-y-auto bg-gray-50 border-t font-mono text-[10px] leading-relaxed">
              {progressLog.map((line, i) => (
                <div key={i} className="py-0.5 text-gray-700 break-words">
                  {line}
                </div>
              ))}
              {isAiAnalyzing && (
                <div className="flex items-center gap-2 py-1 text-[10px] text-purple-600">
                  <span className="flex gap-0.5">
                    <span className="animate-bounce [animation-delay:0ms]">●</span>
                    <span className="animate-bounce [animation-delay:150ms]">●</span>
                    <span className="animate-bounce [animation-delay:300ms]">●</span>
                  </span>
                  <span>IA processando... {elapsedSeconds > 0 ? `(${elapsedSeconds}s)` : ''}</span>
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Cards list + File report — área rolável */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="px-4 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Cards criados</p>
          {Object.entries(cardsByCategory).map(([category, groupCards]) => (
            <div key={category} className="mb-2 last:mb-0">
              <p className="text-[9px] font-semibold text-gray-600 mb-1">{category}</p>
              {groupCards.map(card => (
                <div key={card.id} className="flex items-start gap-1.5 py-0.5">
                  <span className="text-green-500 text-[10px] leading-tight mt-0.5">✓</span>
                  <p className="text-[10px] font-medium text-gray-800 leading-tight truncate min-w-0">
                    {card.title} · {card.screensCount} screens
                  </p>
                </div>
              ))}
            </div>
          ))}
          {isGenerating && (
            <div className="flex items-center gap-2 text-[10px] text-gray-400 py-1">
              <span className="inline-block animate-spin">⟳</span>
              Gerando próximo card...
            </div>
          )}
          {cards.length === 0 && !isGenerating && (
            <p className="text-[10px] text-gray-400 py-1.5">Aguardando cards...</p>
          )}
        </div>

        {/* Arquivos avaliados — dentro da área rolável */}
        {fileReport && fileReport.included.length > 0 && (
          <div className="border-t flex-shrink-0">
            <button
              onClick={() => setIncludedOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-[11px] text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span>Arquivos avaliados: {fileReport.included.length}</span>
              {includedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {includedOpen && (
              <div className="px-4 pb-3 bg-gray-50 border-t">
                <div className="pt-2">
                  <FileTreeView paths={fileReport.included} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* File report — dentro da área rolável */}
        {fileReport && (
          <div className="border-t flex-shrink-0">
            <button
              onClick={() => setFileReportOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-[11px] text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span>Arquivos ignorados: {fileReport.total}</span>
              {fileReportOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {fileReportOpen && (
              <div className="px-4 pb-3 bg-gray-50 border-t">
                {Object.entries(fileReport.groups).map(([reason, paths]) => (
                  <div key={reason} className="pt-2 space-y-1">
                    <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">
                      {REASON_LABELS[reason] ?? reason} ({paths.length})
                    </p>
                    <div className="space-y-0.5">
                      {paths.map((path, i) => (
                        <p key={i} className="text-[9px] text-gray-400 font-mono leading-relaxed break-all">
                          {path}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t flex-shrink-0 flex justify-end">
        <Button variant="outline" size="sm" className="h-6 text-[11px] gap-1.5" onClick={handleOpenProject}>
          <ExternalLink className="h-3 w-3" />
          Ver Projeto
        </Button>
      </div>
    </div>
  )

  if (mode === 'panel') {
    return (
      <div className="fixed top-0 right-0 h-screen w-80 bg-white border-l shadow-xl z-[60] flex flex-col">
        {content}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        {content}
      </div>
    </div>
  )
}
