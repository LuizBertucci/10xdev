import crypto from 'crypto'

/**
 * JWT UTILITIES - Implementação JWT Própria e Completa
 * 
 * Sistema JWT profissional sem dependências externas problemáticas,
 * com suporte completo a TypeScript e funcionalidades avançadas.
 */

export interface JWTPayload {
  [key: string]: any
  iat?: number
  exp?: number
  iss?: string
  aud?: string
}

export interface JWTOptions {
  expiresIn?: string | number
  issuer?: string
  audience?: string
}

class JWTService {
  /**
   * Converte expiresIn para timestamp
   */
  private parseExpiresIn(expiresIn: string | number): number {
    if (typeof expiresIn === 'number') {
      return Math.floor(Date.now() / 1000) + expiresIn
    }

    const now = Math.floor(Date.now() / 1000)
    const match = expiresIn.match(/^(\d+)([smhd])$/)
    
    if (!match) {
      throw new Error('Formato inválido para expiresIn. Use: 15s, 15m, 24h, 7d')
    }

    const value = parseInt(match[1]!)
    const unit = match[2]!
    
    const multipliers = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    }
    
    return now + (value * multipliers[unit as keyof typeof multipliers])
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  /**
   * Base64 URL decode
   */
  private base64UrlDecode(str: string): string {
    // Adicionar padding se necessário
    const padded = str + '='.repeat((4 - str.length % 4) % 4)
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64').toString()
  }

  /**
   * Criar assinatura HMAC
   */
  private createSignature(data: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(data)
    return this.base64UrlEncode(hmac.digest().toString('base64'))
  }

  /**
   * GERAR TOKEN JWT
   */
  sign(payload: JWTPayload, secret: string, options: JWTOptions = {}): string {
    // Header
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    }

    // Payload com claims padrão
    const now = Math.floor(Date.now() / 1000)
    const claims: JWTPayload = {
      ...payload,
      iat: now
    }

    // Adicionar expiração se especificada
    if (options.expiresIn) {
      claims.exp = this.parseExpiresIn(options.expiresIn)
    }

    // Adicionar issuer se especificado
    if (options.issuer) {
      claims.iss = options.issuer
    }

    // Adicionar audience se especificado
    if (options.audience) {
      claims.aud = options.audience
    }

    // Criar token
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(claims))
    const data = `${encodedHeader}.${encodedPayload}`
    const signature = this.createSignature(data, secret)

    return `${data}.${signature}`
  }

  /**
   * VERIFICAR E DECODIFICAR TOKEN JWT
   */
  verify(token: string, secret: string): JWTPayload | null {
    try {
      const parts = token.split('.')
      
      if (parts.length !== 3) {
        console.error('❌ [JWT] Token inválido: formato incorreto')
        return null
      }

      const encodedHeader = parts[0]
      const encodedPayload = parts[1]
      const signature = parts[2]
      const data = `${encodedHeader}.${encodedPayload}`

      // Verificar assinatura
      const expectedSignature = this.createSignature(data, secret)
      if (signature !== expectedSignature) {
        console.error('❌ [JWT] Token inválido: assinatura incorreta')
        return null
      }

      // Decodificar header e payload
      const header = JSON.parse(this.base64UrlDecode(encodedHeader!))
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload!))

      // Verificar algoritmo
      if (header.alg !== 'HS256') {
        console.error('❌ [JWT] Token inválido: algoritmo não suportado')
        return null
      }

      // Verificar expiração
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        console.error('❌ [JWT] Token expirado')
        return null
      }

      // Verificar se o token já está ativo
      if (payload.iat && payload.iat > now + 60) { // 1 min de tolerância
        console.error('❌ [JWT] Token ainda não é válido')
        return null
      }

      return payload
    } catch (error: any) {
      console.error('❌ [JWT] Erro ao verificar token:', error.message)
      return null
    }
  }

  /**
   * DECODIFICAR TOKEN SEM VERIFICAÇÃO (para debug)
   */
  decode(token: string): { header: any, payload: JWTPayload } | null {
    try {
      const parts = token.split('.')
      
      if (parts.length !== 3) {
        return null
      }

      const header = JSON.parse(this.base64UrlDecode(parts[0]!))
      const payload = JSON.parse(this.base64UrlDecode(parts[1]!))

      return { header, payload }
    } catch (error) {
      return null
    }
  }

  /**
   * VERIFICAR SE TOKEN ESTÁ EXPIRADO (sem verificar assinatura)
   */
  isExpired(token: string): boolean {
    try {
      const decoded = this.decode(token)
      if (!decoded) return true

      const now = Math.floor(Date.now() / 1000)
      return decoded.payload.exp ? decoded.payload.exp < now : false
    } catch (error) {
      return true
    }
  }

  /**
   * OBTER TEMPO DE EXPIRAÇÃO RESTANTE (em segundos)
   */
  getTimeUntilExpiry(token: string): number {
    try {
      const decoded = this.decode(token)
      if (!decoded || !decoded.payload.exp) return 0

      const now = Math.floor(Date.now() / 1000)
      return Math.max(0, decoded.payload.exp - now)
    } catch (error) {
      return 0
    }
  }
}

// Instância singleton
export const jwtService = new JWTService()

// Exports para compatibilidade
export const sign = jwtService.sign.bind(jwtService)
export const verify = jwtService.verify.bind(jwtService)
export const decode = jwtService.decode.bind(jwtService)
export const isExpired = jwtService.isExpired.bind(jwtService)
export const getTimeUntilExpiry = jwtService.getTimeUntilExpiry.bind(jwtService)

export default jwtService