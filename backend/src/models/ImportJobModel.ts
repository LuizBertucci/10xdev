import { supabaseAdmin, executeQuery } from '@/database/supabase'

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

export type ImportJobStatus = 'running' | 'done' | 'error'

/**
 * Model simples (service-role) para criar/atualizar import_jobs.
 * Usa snake_case (colunas do Postgres) para facilitar no controller.
 */
export class ImportJobModel {
  static async create(input: {
    project_id: string
    created_by: string
    status?: ImportJobStatus
    step?: ImportJobStep
    progress?: number
    message?: string | null
    ai_requested?: boolean
  }): Promise<{ id: string }> {
    const { data } = await executeQuery(
      supabaseAdmin
        .from('import_jobs')
        .insert({
          project_id: input.project_id,
          created_by: input.created_by,
          status: input.status || 'running',
          step: input.step || 'starting',
          progress: input.progress ?? 0,
          message: input.message ?? null,
          ai_requested: input.ai_requested ?? false
        })
        .select('id')
        .single()
    )

    return { id: data.id as string }
  }

  static async update(jobId: string, patch: Record<string, any>): Promise<void> {
    // Remove undefined para não colidir com exactOptionalPropertyTypes / updates parciais
    const clean: Record<string, any> = {}
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) clean[k] = v
    }
    if (Object.keys(clean).length === 0) return

    await executeQuery(
      supabaseAdmin
        .from('import_jobs')
        .update(clean)
        .eq('id', jobId)
    )
  }
}

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
  created_at?: string
  updated_at?: string
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
  updated_at?: string
}

export class ImportJobModel {
  static async create(data: ImportJobInsert): Promise<ImportJobRow> {
    const now = new Date().toISOString()
    const insert: ImportJobInsert = {
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
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    }

    const { data: row } = await executeQuery(
      supabaseAdmin.from('import_jobs').insert(insert).select('*').single()
    )
    return row as ImportJobRow
  }

  static async update(id: string, patch: ImportJobUpdate): Promise<void> {
    const update: ImportJobUpdate = {
      ...patch,
      updated_at: patch.updated_at || new Date().toISOString(),
    }
    await executeQuery(
      supabaseAdmin.from('import_jobs').update(update).eq('id', id)
    )
  }
}


