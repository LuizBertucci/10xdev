import { createClient } from '@/lib/supabase'

export const IMPORT_JOB_LS_KEY = 'activeImportJob'
export const IMPORT_MODAL_OPEN_KEY = 'importModalOpen'
export const IMPORT_MODAL_CHANGE_EVENT = 'import-modal-change'

export interface FileReport {
  included: string[]
  ignored: { path: string; reason: string }[]
}

export interface ImportJob {
  id: string
  project_id: string
  status: 'running' | 'done' | 'error'
  step: string
  progress: number
  message: string | null
  error: string | null
  files_processed: number
  cards_created: number
  ai_requested: boolean
  ai_used: boolean
  ai_cards_created: number
  file_report_json?: FileReport | null
  progress_log?: string[] | null
}

export interface ActiveImportRef {
  jobId: string
  projectId: string
  createdAt?: string
}

export function safeParse(json: string | null): ActiveImportRef | null {
  if (!json) return null
  try {
    return JSON.parse(json) as ActiveImportRef
  } catch {
    return null
  }
}

export function defaultMessage(step: string): string {
  const map: Record<string, string> = {
    starting: 'Iniciando importação...',
    downloading_zip: 'Baixando o repositório...',
    extracting_files: 'Extraindo arquivos...',
    analyzing_repo: 'Analisando o projeto...',
    generating_cards: 'Organizando cards...',
    creating_cards: 'Criando cards...',
    linking_cards: 'Associando cards ao projeto...',
    done: 'Importação concluída.',
    error: 'Erro na importação.'
  }
  return map[step] || 'Processando...'
}

export function clearActiveImport(
  setActive: (v: ActiveImportRef | null) => void,
  setJob: (v: ImportJob | null) => void
) {
  setActive(null)
  setJob(null)
  try { localStorage.removeItem(IMPORT_JOB_LS_KEY) } catch { /* ignore */ }
}

export async function fetchImportJob(jobId: string): Promise<ImportJob | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle()
    return data as ImportJob | null
  } catch {
    return null
  }
}

