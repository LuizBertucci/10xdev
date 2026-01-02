"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase'
import { type ActiveImportRef, type ImportJob, IMPORT_JOB_LS_KEY, safeParse, clearActiveImport, defaultMessage } from '@/lib/importJobUtils'

export default function ImportProgressWidget() {
  const router = useRouter()
  const supabase = useMemo(() => { try { return createClient() } catch { return null } }, [])

  const [active, setActive] = useState<ActiveImportRef | null>(null)
  const [job, setJob] = useState<ImportJob | null>(null)
  const lastStatusRef = useRef<string | null>(null)

  // Restaurar job ativo do localStorage (se existir)
  useEffect(() => {
    try {
      const saved = safeParse(localStorage.getItem(IMPORT_JOB_LS_KEY))
      if (saved?.jobId && saved?.projectId) setActive(saved)
    } catch { /* ignore */ }
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

      if (jobData.status === 'done' || jobData.status === 'error') {
        setTimeout(() => { if (mounted) clearActiveImport(setActive, setJob) }, 5000)
      }
    }

    fetchInitial()

    const channel = supabase
      .channel(`import_job_global:${active.jobId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'import_jobs', filter: `id=eq.${active.jobId}` }, (payload) => {
        if ((payload as any).eventType === 'DELETE') {
          clearActiveImport(setActive, setJob)
          return
        }

        const row: any = (payload as any).new || null
        if (!row) return

        setJob(row as ImportJob)

        const status = row.status as string | undefined
        if (status && status !== lastStatusRef.current) {
          lastStatusRef.current = status
          if (status === 'done' || status === 'error') {
            setTimeout(() => clearActiveImport(setActive, setJob), 5000)
          }
        }
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [supabase, active?.jobId])

  const ui = useMemo(() => {
    if (!active?.jobId || !job || job.status !== 'running') return null
    const progress = Math.max(0, Math.min(100, Number(job.progress ?? 0)))
    const message = job.message || defaultMessage(job.step || 'starting')
    return { progress, message }
  }, [active?.jobId, job])

  if (!ui) return null

  const handleOpenProject = () => {
    if (!active?.projectId || !active?.jobId) return
    // Mantém compatível com a navegação já usada no app (tab=projects&id=...)
    const query: Record<string, string> = {
      ...(router.query as any),
      tab: 'projects',
      id: active.projectId,
      jobId: active.jobId
    }
    router.push({ pathname: '/', query }, undefined, { shallow: true })
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border bg-white shadow-lg">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">Importação em andamento</p>
                <p className="text-xs text-gray-600 mt-0.5 truncate">{ui.message}</p>
              </div>
              <button
                onClick={() => clearActiveImport(setActive, setJob)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3">
              <Progress value={ui.progress} className="h-2" />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700">{ui.progress}%</span>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleOpenProject}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
              <span>Arquivos: {job?.files_processed ?? 0}</span>
              <span>Cards: {job?.cards_created ?? 0}</span>
              <span>IA: {job?.ai_requested ? (job?.ai_used ? 'usada' : 'pendente') : 'desativada'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

