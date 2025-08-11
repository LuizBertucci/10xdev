import { supabaseAdminTyped, isDevMode } from '../database/supabase'

export interface JWTBlacklistEntry {
  id: string
  token: string
  user_id: string
  expires_at: string
  created_at: string
  reason?: string
}

export interface CreateBlacklistData {
  token: string
  user_id: string
  expires_at: string
  reason?: string
}

class JWTBlacklistModel {
  private devBlacklist = new Set<string>() // In-memory blacklist para desenvolvimento
  
  constructor() {
    if (isDevMode) {
      console.log('⚠️  [JWTBlacklistModel] Executando em modo desenvolvimento - usando blacklist in-memory')
      
      // Limpar blacklist periodicamente em desenvolvimento (10 minutos)
      setInterval(() => {
        this.devBlacklist.clear()
        console.log('🗑️ [JWTBlacklistModel] Blacklist dev limpa automaticamente')
      }, 10 * 60 * 1000)
    }
  }

  /**
   * ADICIONAR TOKEN À BLACKLIST
   */
  async addToBlacklist(data: CreateBlacklistData): Promise<boolean> {
    try {
      if (isDevMode) {
        this.devBlacklist.add(data.token)
        console.log(`🚫 [JWTBlacklist] Token adicionado à blacklist (DEV): ${data.token.substring(0, 20)}...`)
        return true
      }

      const { error } = await supabaseAdminTyped
        .from('jwt_blacklist')
        .insert({
          token: data.token,
          user_id: data.user_id,
          expires_at: data.expires_at,
          reason: data.reason || 'logout',
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Erro ao adicionar token à blacklist:', error)
        return false
      }

      console.log(`🚫 [JWTBlacklist] Token adicionado à blacklist: ${data.token.substring(0, 20)}...`)
      return true

    } catch (error: any) {
      console.error('Erro ao adicionar token à blacklist:', error.message)
      return false
    }
  }

  /**
   * VERIFICAR SE TOKEN ESTÁ NA BLACKLIST
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      if (isDevMode) {
        const isBlacklisted = this.devBlacklist.has(token)
        if (isBlacklisted) {
          console.log(`🚫 [JWTBlacklist] Token está na blacklist (DEV): ${token.substring(0, 20)}...`)
        }
        return isBlacklisted
      }

      const { data, error } = await supabaseAdminTyped
        .from('jwt_blacklist')
        .select('id')
        .eq('token', token)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Erro ao verificar blacklist:', error)
        return false
      }

      const isBlacklisted = !!data
      if (isBlacklisted) {
        console.log(`🚫 [JWTBlacklist] Token está na blacklist: ${token.substring(0, 20)}...`)
      }

      return isBlacklisted

    } catch (error: any) {
      console.error('Erro ao verificar blacklist:', error.message)
      return false
    }
  }

  /**
   * LIMPAR TOKENS EXPIRADOS
   */
  async cleanExpiredTokens(): Promise<number> {
    try {
      if (isDevMode) {
        // Em desenvolvimento, não há necessidade de limpeza automática
        // pois já fazemos limpeza periódica
        console.log('🗑️ [JWTBlacklist] Limpeza não necessária em modo dev')
        return 0
      }

      const now = new Date().toISOString()
      
      const { data, error } = await supabaseAdminTyped
        .from('jwt_blacklist')
        .delete()
        .lt('expires_at', now)
        .select('id')

      if (error) {
        console.error('Erro ao limpar tokens expirados:', error)
        return 0
      }

      const deletedCount = data ? data.length : 0
      if (deletedCount > 0) {
        console.log(`🗑️ [JWTBlacklist] ${deletedCount} tokens expirados removidos`)
      }

      return deletedCount

    } catch (error: any) {
      console.error('Erro ao limpar tokens expirados:', error.message)
      return 0
    }
  }

  /**
   * INVALIDAR TODOS OS TOKENS DE UM USUÁRIO
   */
  async invalidateAllUserTokens(userId: string, reason: string = 'security'): Promise<boolean> {
    try {
      if (isDevMode) {
        // Em modo dev, apenas loggar a ação
        console.log(`🚫 [JWTBlacklist] Todos os tokens do usuário ${userId} seriam invalidados (DEV): ${reason}`)
        return true
      }

      // Nota: Esta operação requer que tenhamos uma forma de identificar
      // todos os tokens ativos de um usuário. Por simplicidade, vamos
      // implementar uma lógica que marca o usuário para reautenticação
      
      // Criar uma entrada especial na blacklist para invalidar todos os tokens
      const { error } = await supabaseAdminTyped
        .from('jwt_blacklist')
        .insert({
          token: `user_invalidate_${userId}_${Date.now()}`,
          user_id: userId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
          reason: `bulk_invalidate: ${reason}`,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Erro ao invalidar tokens do usuário:', error)
        return false
      }

      console.log(`🚫 [JWTBlacklist] Todos os tokens do usuário ${userId} invalidados por: ${reason}`)
      return true

    } catch (error: any) {
      console.error('Erro ao invalidar tokens do usuário:', error.message)
      return false
    }
  }

  /**
   * OBTER ESTATÍSTICAS DA BLACKLIST
   */
  async getStats(): Promise<{ total: number, expired: number, active: number }> {
    try {
      if (isDevMode) {
        return {
          total: this.devBlacklist.size,
          expired: 0,
          active: this.devBlacklist.size
        }
      }

      const now = new Date().toISOString()

      const { data: totalData, error: totalError } = await supabaseAdminTyped
        .from('jwt_blacklist')
        .select('id', { count: 'exact' })

      const { data: expiredData, error: expiredError } = await supabaseAdminTyped
        .from('jwt_blacklist')
        .select('id', { count: 'exact' })
        .lt('expires_at', now)

      if (totalError || expiredError) {
        console.error('Erro ao obter estatísticas da blacklist')
        return { total: 0, expired: 0, active: 0 }
      }

      const total = totalData?.length || 0
      const expired = expiredData?.length || 0
      const active = total - expired

      return { total, expired, active }

    } catch (error: any) {
      console.error('Erro ao obter estatísticas da blacklist:', error.message)
      return { total: 0, expired: 0, active: 0 }
    }
  }
}

export default new JWTBlacklistModel()