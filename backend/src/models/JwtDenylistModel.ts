import { jwtQueries, dbUtils } from '../database/sqlite'

export interface JwtDenylistEntry {
  id: string
  jti: string  // JWT ID (unique token identifier)
  exp: string  // Expiration timestamp (ISO string)
  created_at: string
}

export interface JwtDenylistStats {
  total: number
  expired: number
  active: number
  last_cleanup: string | null
}

export class JwtDenylistModel {
  /**
   * Add token to denylist (blacklist token)
   */
  static async addToken(jti: string, exp: number): Promise<JwtDenylistEntry> {
    try {
      // Check if token already exists
      const existing = await this.findByJti(jti)
      if (existing) {
        console.warn(`Token ${jti} already in denylist`)
        return existing
      }

      const entry = jwtQueries.addToken.get(jti, exp) as JwtDenylistEntry
      console.log(`✅ Token ${jti} added to denylist`)
      return entry
    } catch (error) {
      console.error('Error adding token to denylist:', error)
      throw error
    }
  }

  /**
   * Check if token is denied/blacklisted
   */
  static async isTokenDenied(jti: string): Promise<boolean> {
    try {
      return dbUtils.isTokenDenied(jti)
    } catch (error) {
      console.error('Error checking if token is denied:', error)
      // In case of error, assume token is valid to avoid blocking users
      return false
    }
  }

  /**
   * Find token by JTI
   */
  static async findByJti(jti: string): Promise<JwtDenylistEntry | null> {
    try {
      const entry = jwtQueries.findByJti.get(jti) as JwtDenylistEntry | undefined
      return entry || null
    } catch (error) {
      console.error('Error finding token by JTI:', error)
      throw error
    }
  }

  /**
   * Clean up expired tokens from denylist
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      return dbUtils.cleanupExpired()
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error)
      throw error
    }
  }

  /**
   * Find all tokens with pagination
   */
  static async findAll(
    page = 1,
    limit = 100,
    filters?: {
      expired?: boolean
      jti?: string
    }
  ): Promise<{ tokens: JwtDenylistEntry[], total: number, page: number, limit: number }> {
    try {
      const offset = (page - 1) * limit
      
      // For simplicity, basic pagination without complex filters
      const tokens = jwtQueries.findAll.all(limit, offset) as JwtDenylistEntry[]
      const totalResult = jwtQueries.count.get() as { total: number }

      return {
        tokens,
        total: totalResult.total,
        page,
        limit
      }
    } catch (error) {
      console.error('Error finding all tokens:', error)
      throw error
    }
  }

  /**
   * Get denylist statistics
   */
  static async getStats(): Promise<JwtDenylistStats> {
    try {
      const stats = dbUtils.getStats()
      
      return {
        total: stats.tokens.total,
        expired: stats.tokens.expired,
        active: stats.tokens.active,
        last_cleanup: new Date().toISOString() // Current time as last cleanup reference
      }
    } catch (error) {
      console.error('Error getting denylist stats:', error)
      throw error
    }
  }

  /**
   * Remove specific token from denylist (for admin operations)
   */
  static async removeToken(jti: string): Promise<boolean> {
    try {
      // Use a simple delete query for this operation
      const db = require('../database/sqlite').db
      const result = db.prepare('DELETE FROM jwt_denylist WHERE jti = ?').run(jti)
      
      if (result.changes > 0) {
        console.log(`✅ Token ${jti} removed from denylist`)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error removing token from denylist:', error)
      throw error
    }
  }

  /**
   * Bulk add tokens to denylist
   */
  static async bulkAddTokens(tokens: { jti: string, exp: number }[]): Promise<JwtDenylistEntry[]> {
    try {
      const results: JwtDenylistEntry[] = []
      
      for (const token of tokens) {
        try {
          const entry = await this.addToken(token.jti, token.exp)
          results.push(entry)
        } catch (error) {
          console.warn(`Failed to add token ${token.jti}:`, error)
        }
      }

      console.log(`✅ Added ${results.length}/${tokens.length} tokens to denylist`)
      return results
    } catch (error) {
      console.error('Error bulk adding tokens:', error)
      throw error
    }
  }

  /**
   * Clear all expired tokens (admin operation)
   */
  static async clearExpiredTokens(): Promise<number> {
    try {
      const removedCount = await this.cleanupExpiredTokens()
      console.log(`✅ Admin cleanup: removed ${removedCount} expired tokens`)
      return removedCount
    } catch (error) {
      console.error('Error clearing expired tokens:', error)
      throw error
    }
  }

  /**
   * Check token health and perform maintenance
   */
  static async performMaintenance(): Promise<{
    cleaned: number
    stats: JwtDenylistStats
  }> {
    try {
      // Clean up expired tokens
      const cleaned = await this.cleanupExpiredTokens()
      
      // Get updated stats
      const stats = await this.getStats()

      console.log(`🔧 Maintenance complete: cleaned ${cleaned} tokens, ${stats.active} active tokens remaining`)
      
      return { cleaned, stats }
    } catch (error) {
      console.error('Error performing maintenance:', error)
      throw error
    }
  }

  /**
   * Validate token expiration format
   */
  static isValidExpiration(exp: number): boolean {
    try {
      const now = Math.floor(Date.now() / 1000) // Current Unix timestamp
      return exp > now && exp < (now + (365 * 24 * 60 * 60)) // Not expired and not more than 1 year
    } catch {
      return false
    }
  }

  /**
   * Get token expiration as human readable string
   */
  static formatExpiration(exp: string): string {
    try {
      const expDate = new Date(exp)
      const now = new Date()
      const diffMs = expDate.getTime() - now.getTime()
      
      if (diffMs < 0) {
        return 'Expired'
      }
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffDays > 0) {
        return `${diffDays} days remaining`
      } else if (diffHours > 0) {
        return `${diffHours} hours remaining`
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return `${diffMinutes} minutes remaining`
      }
    } catch {
      return 'Invalid expiration'
    }
  }
}