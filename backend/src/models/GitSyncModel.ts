import { supabaseAdmin } from '@/database/supabase'
import type {
  GitSyncFileMappingRow,
  GitSyncFileMappingInsert,
  GitSyncFileMappingUpdate,
  ModelResult,
  ModelListResult
} from '@/types/project'

// ================================================
// GITSYNC MODEL
// Operacoes de banco para gitsync_file_mappings
// ================================================

export class GitSyncModel {

  // ================================================
  // FILE MAPPINGS - CRUD
  // ================================================

  /** Cria um mapeamento arquivo <-> card */
  static async createMapping(
    data: GitSyncFileMappingInsert
  ): Promise<ModelResult<GitSyncFileMappingRow>> {
    try {
      const { data: row, error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .insert({
          project_id: data.project_id,
          card_feature_id: data.card_feature_id,
          file_path: data.file_path,
          branch_name: data.branch_name || 'main',
          last_commit_sha: data.last_commit_sha || null,
          last_synced_at: data.last_synced_at || new Date().toISOString(),
          card_modified_at: data.card_modified_at || null
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data: row }
    } catch (error: unknown) {
      console.error('Erro ao criar file mapping:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }

  /** Cria mapeamentos em bulk (apos import inicial) */
  static async createMappingsBulk(
    mappings: GitSyncFileMappingInsert[]
  ): Promise<ModelListResult<GitSyncFileMappingRow>> {
    try {
      if (mappings.length === 0) {
        return { success: true, data: [], count: 0 }
      }

      const rows = mappings.map(m => ({
        project_id: m.project_id,
        card_feature_id: m.card_feature_id,
        file_path: m.file_path,
        branch_name: m.branch_name || 'main',
        last_commit_sha: m.last_commit_sha || null,
        last_synced_at: m.last_synced_at || new Date().toISOString(),
        card_modified_at: m.card_modified_at || null
      }))

      const { data, error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .insert(rows)
        .select()

      if (error) throw error
      return { success: true, data: data || [], count: data?.length || 0 }
    } catch (error: unknown) {
      console.error('Erro ao criar file mappings em bulk:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }

  /** Upsert em bulk por (project_id, file_path), reutilizando ou realocando mappings existentes */
  static async upsertMappingsBulk(
    mappings: GitSyncFileMappingInsert[]
  ): Promise<ModelListResult<GitSyncFileMappingRow>> {
    try {
      if (mappings.length === 0) {
        return { success: true, data: [], count: 0 }
      }

      const rows = mappings.map(m => ({
        project_id: m.project_id,
        card_feature_id: m.card_feature_id,
        file_path: m.file_path,
        branch_name: m.branch_name || 'main',
        last_commit_sha: m.last_commit_sha || null,
        last_synced_at: m.last_synced_at || new Date().toISOString(),
        card_modified_at: m.card_modified_at || null
      }))

      const { data, error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .upsert(rows, { onConflict: 'project_id,file_path' })
        .select()

      if (error) throw error
      return { success: true, data: data || [], count: data?.length || 0 }
    } catch (error: unknown) {
      console.error('Erro ao fazer upsert de file mappings em bulk:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }

  // ================================================
  // FILE MAPPINGS - QUERIES
  // ================================================

  /** Busca todos os mapeamentos de um projeto */
  static async getMappingsByProject(
    projectId: string
  ): Promise<ModelListResult<GitSyncFileMappingRow>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .select('*')
        .eq('project_id', projectId)
        .order('file_path')

      if (error) throw error
      return { success: true, data: data || [], count: data?.length || 0 }
    } catch (error: unknown) {
      console.error('Erro ao buscar file mappings do projeto:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }

  /** Busca mapeamentos de um card especifico */
  static async getMappingsByCard(
    cardFeatureId: string
  ): Promise<ModelListResult<GitSyncFileMappingRow>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .select('*')
        .eq('card_feature_id', cardFeatureId)
        .order('file_path')

      if (error) throw error
      return { success: true, data: data || [], count: data?.length || 0 }
    } catch (error: unknown) {
      console.error('Erro ao buscar file mappings do card:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }

  /** Busca mapeamento por file_path dentro de um projeto (para webhook push) */
  static async getMappingByFilePath(
    projectId: string,
    filePath: string
  ): Promise<ModelResult<GitSyncFileMappingRow>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .select('*')
        .eq('project_id', projectId)
        .eq('file_path', filePath)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        return { success: false, error: 'Mapeamento não encontrado', statusCode: 404 }
      }
      return { success: true, data }
    } catch (error: unknown) {
      console.error('Erro ao buscar file mapping por path:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }

  // ================================================
  // FILE MAPPINGS - UPDATE
  // ================================================

  /** Atualiza um mapeamento (SHA, timestamps, PR info) */
  static async updateMapping(
    id: string,
    data: GitSyncFileMappingUpdate
  ): Promise<ModelResult<GitSyncFileMappingRow>> {
    try {
      const { data: row, error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { success: true, data: row }
    } catch (error: unknown) {
      console.error('Erro ao atualizar file mapping:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }

  /** Atualiza card_modified_at para um card (chamado quando card e editado) */
  static async markCardModified(
    cardFeatureId: string
  ): Promise<ModelListResult<GitSyncFileMappingRow>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .update({ card_modified_at: new Date().toISOString() })
        .eq('card_feature_id', cardFeatureId)
        .select()

      if (error) throw error
      return { success: true, data: data || [], count: data?.length || 0 }
    } catch (error: unknown) {
      console.error('Erro ao marcar card como modificado:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }

  // ================================================
  // CONFLICT DETECTION
  // ================================================

  /** Busca mapeamentos com conflito potencial:
   *  card_modified_at > last_synced_at (card foi editado apos ultimo sync).
   *  PostgREST nao suporta comparacao entre colunas, entao busca candidatos e filtra em JS. */
  static async getConflicts(
    projectId: string
  ): Promise<ModelListResult<GitSyncFileMappingRow>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .select('*')
        .eq('project_id', projectId)
        .not('card_modified_at', 'is', null)

      if (error) throw error

      const conflicts = (data || []).filter(m =>
        m.card_modified_at && m.last_synced_at &&
        new Date(m.card_modified_at) > new Date(m.last_synced_at)
      )

      return { success: true, data: conflicts, count: conflicts.length }
    } catch (error: unknown) {
      console.error('Erro ao buscar conflitos:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }

  /** Conta conflitos de um projeto (para status rapido) */
  static async countConflicts(projectId: string): Promise<number> {
    const result = await this.getConflicts(projectId)
    return result.data?.length || 0
  }

  // ================================================
  // DELETE
  // ================================================

  /** Remove todos os mapeamentos de um projeto (ao desconectar) */
  static async deleteByProject(projectId: string): Promise<ModelResult> {
    try {
      const { error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .delete()
        .eq('project_id', projectId)

      if (error) throw error
      return { success: true }
    } catch (error: unknown) {
      console.error('Erro ao deletar file mappings do projeto:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }

  /** Remove mapeamentos de um card especifico */
  static async deleteByCard(cardFeatureId: string): Promise<ModelResult> {
    try {
      const { error } = await supabaseAdmin
        .from('gitsync_file_mappings')
        .delete()
        .eq('card_feature_id', cardFeatureId)

      if (error) throw error
      return { success: true }
    } catch (error: unknown) {
      console.error('Erro ao deletar file mappings do card:', error)
      const err = error as { message?: string; statusCode?: number }
      return { success: false, error: err.message || 'Erro desconhecido', statusCode: err.statusCode || 500 }
    }
  }
}
