import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface ImportJobInfo {
  jobId: string
  progress: number
  step: string
  message: string | null
}

export function useProjectImportJobs(projectIds: string[]) {
  const supabase = useMemo(() => {
    try { return createClient() } catch { return null }
  }, [])

  const [runningImports, setRunningImports] = useState<Map<string, ImportJobInfo>>(new Map())

  useEffect(() => {
    if (!supabase || projectIds.length === 0) return
    let mounted = true

    const loadRunningImports = async () => {
      try {
        const { data } = await supabase
          .from('import_jobs')
          .select('id, project_id, progress, step, message')
          .eq('status', 'running')
          .in('project_id', projectIds)

        if (!mounted) return

        const map = new Map<string, ImportJobInfo>()
        ;(data || []).forEach((job: any) => {
          map.set(job.project_id, {
            jobId: job.id,
            progress: Number(job.progress ?? 0),
            step: job.step,
            message: job.message ?? null
          })
        })
        setRunningImports(map)
      } catch {
        // best-effort
      }
    }

    loadRunningImports()

    const channel = supabase
      .channel('running-imports-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'import_jobs' }, () => {
        loadRunningImports()
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [projectIds.join(','), supabase])

  return {
    runningImports,
    hasRunningImport: (projectId: string) => runningImports.has(projectId),
    getImportInfo: (projectId: string) => runningImports.get(projectId) ?? null
  }
}

