import { supabaseAdmin, executeQuery } from '@/database/supabase'
import { randomUUID } from 'crypto'

export type ImportJobStatus = 'running' | 'done' | 'error'

export type ImportJobStep =
  | 'starting'
  | 'downloading_zip'
  | 'extracting_files'
  | 'analyzing_repo'
  | 'generating_cards'
  | 'creating_cards'
  | 'linking_cards'
  | 'done'
  | 'error'

export interface ImportJobRow {
  id: string
  project_id: string
  created_by: string
  status: ImportJobStatus
  step: ImportJobStep
  progress: number
  message: string | null
  error: string | null
  ai_requested: boolean
  ai_used: boolean
  ai_cards_created: number
  files_processed: number
  cards_created: number
  created_at: string
  updated_at: string
}

export interface ImportJobInsert {
  id?: string
  project_id: string
  created_by: string
  status?: ImportJobStatus
  step?: ImportJobStep
  progress?: number
  message?: string | null
  error?: string | null
  ai_requested?: boolean
  ai_used?: boolean
  ai_cards_created?: number
  files_processed?: number
  cards_created?: number
}

export interface ImportJobUpdate {
  status?: ImportJobStatus
  step?: ImportJobStep
  progress?: number
  message?: string | null
  error?: string | null
  ai_used?: boolean
  ai_cards_created?: number
  files_processed?: number
  cards_created?: number
}

export class ImportJobModel {
  static async create(data: ImportJobInsert): Promise<ImportJobRow> {
    const now = new Date().toISOString()

    const insert: ImportJobInsert & { created_at?: string; updated_at?: string } = {
      id: data.id || randomUUID(),
      project_id: data.project_id,
      created_by: data.created_by,
      status: data.status || 'running',
      step: data.step || 'starting',
      progress: data.progress ?? 0,
      message: data.message ?? null,
      error: data.error ?? null,
      ai_requested: data.ai_requested ?? false,
      ai_used: data.ai_used ?? false,
      ai_cards_created: data.ai_cards_created ?? 0,
      files_processed: data.files_processed ?? 0,
      cards_created: data.cards_created ?? 0,
      created_at: now,
      updated_at: now
    }

    const { data: row } = await executeQuery(
      supabaseAdmin
        .from('import_jobs')
        .insert(insert)
        .select('*')
        .single()
    )

    return row as ImportJobRow
  }

  static async update(id: string, patch: ImportJobUpdate): Promise<void> {
    const clean: Record<string, any> = {}
    for (const [k, v] of Object.entries({ ...patch, updated_at: new Date().toISOString() })) {
      if (v !== undefined) clean[k] = v
    }

    await executeQuery(
      supabaseAdmin
        .from('import_jobs')
        .update(clean)
        .eq('id', id)
    )
  }

  static async hasRunningForProject(projectId: string): Promise<boolean> {
    const { data } = await executeQuery(
      supabaseAdmin
        .from('import_jobs')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'running')
        .limit(1)
    )

    return Array.isArray(data) && data.length > 0
  }

  static async getRunningForProject(
    projectId: string
  ): Promise<Pick<ImportJobRow, 'id' | 'progress' | 'step' | 'message'> | null> {
    const { data } = await executeQuery(
      supabaseAdmin
        .from('import_jobs')
        .select('id, progress, step, message')
        .eq('project_id', projectId)
        .eq('status', 'running')
        .order('updated_at', { ascending: false })
        .limit(1)
    )

    if (!Array.isArray(data) || data.length === 0) return null
    const row: any = data[0]

    return {
      id: row.id,
      progress: Number(row.progress ?? 0),
      step: row.step,
      message: row.message ?? null
    }
  }
}

