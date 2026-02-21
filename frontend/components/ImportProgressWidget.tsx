"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  type ActiveImportRef,
  type ImportJob,
  IMPORT_JOB_LS_KEY,
  IMPORT_MODAL_CHANGE_EVENT,
  IMPORT_MODAL_OPEN_KEY,
  clearActiveImport,
  defaultMessage,
  safeParse,
} from '@/lib/importJobUtils'

interface ImportProgressWidgetProps {
  /** Quando true, renderiza inline (sem fixed) para uso no header da página do projeto */
  inline?: boolean
  /** Quando inline, só exibe se o job for do projeto atual */
  projectId?: string
}

export default function ImportProgressWidget({ inline, projectId }: ImportProgressWidgetProps = {}) {
  const supabase = useMemo(() => { try { return createClient() } catch { return null } }, [])

  const [active, setActive] = useState<ActiveImportRef | null>(null)
  const [job, setJob] = useState<ImportJob | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const lastStatusRef = useRef<string | null>(null)

  // Restaurar job ativo do localStorage
  useEffect(() => {
    try {
      const saved = safeParse(localStorage.getItem(IMPORT_JOB_LS_KEY))
      if (saved?.jobId && saved?.projectId) setActive(saved)
    } catch { /* ignore */ }
  }, [])

  // Sincronizar estado do modal
  useEffect(() => {
    const sync = () => {
      try { setModalOpen(localStorage.getItem(IMPORT_MODAL_OPEN_KEY) === 'true') } catch { /* ignore */ }
    }
    sync()
    window.addEventListener(IMPORT_MODAL_CHANGE_EVENT, sync)
    return () => window.removeEventListener(IMPORT_MODAL_CHANGE_EVENT, sync)
  }, [])

  // Realtime do job
  useEffect(() => {
    if (!supabase || !active?.jobId) return
    let mounted = true

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', active.jobId)
        .maybeSingle()

      if (!mounted) return

      if (error || !data) {
        clearActiveImport(setActive, setJob)
        return
      }

      const jobData = data as ImportJob
      setJob(jobData)
    }

    fetchInitial()

    const channel = supabase
      .channel(`import_job_global:${active.jobId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'import_jobs', filter: `id=eq.${active.jobId}` }, (payload) => {
        if ((payload as { eventType?: unknown }).eventType === 'DELETE') {
          clearActiveImport(setActive, setJob)
          return
        }

        const row: unknown = (payload as { new?: unknown })?.new || null
        if (!row) return

        setJob(row as ImportJob)

        const status = (row as { status?: unknown }).status as string | undefined
        if (status && status !== lastStatusRef.current) {
          lastStatusRef.current = status
        }
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [supabase, active?.jobId])

  const handleOpenModal = () => {
    try {
      localStorage.setItem(IMPORT_MODAL_OPEN_KEY, 'true')
      window.dispatchEvent(new CustomEvent(IMPORT_MODAL_CHANGE_EVENT))
    } catch { /* ignore */ }
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearActiveImport(setActive, setJob)
    try {
      localStorage.setItem(IMPORT_MODAL_OPEN_KEY, 'false')
      window.dispatchEvent(new CustomEvent(IMPORT_MODAL_CHANGE_EVENT))
    } catch { /* ignore */ }
  }

  if (!active?.jobId || !job || modalOpen) return null
  if (inline && projectId && active.projectId !== projectId) return null

  const isRunning = job.status === 'running'
  const progress = Math.max(0, Math.min(100, Number(job.progress ?? 0)))
  const message = job.message || defaultMessage(job.step || 'starting')

  const baseClass = inline
    ? 'w-auto min-w-[200px] bg-white rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow'
    : 'fixed bottom-4 right-4 z-40 w-72 bg-white rounded-xl border shadow-lg cursor-pointer hover:shadow-xl transition-shadow'

  return (
    <div
      className={baseClass}
      onClick={handleOpenModal}
    >
      <div className="px-3 py-2.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900">
            {isRunning ? 'Importação em andamento' : job.status === 'error' ? 'Erro na importação' : 'Importação concluída'}
          </p>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">
            {isRunning ? `${progress}% · ${message}` : `${job.cards_created ?? 0} cards criados`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!isRunning && (
            <span className="text-[10px] font-medium text-blue-600 flex items-center gap-0.5">
              Ver detalhes
              <ChevronRight className="h-3 w-3" />
            </span>
          )}
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-700 p-1 flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
