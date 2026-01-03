import { z } from 'zod'

type FileMeta = {
  path: string
  layer: string
  featureName: string
  size: number
  snippet?: string
}

type ProposedGroup = {
  key: string
  files: string[]
}

const AiOutputSchema = z.object({
  cards: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional().default(''),
    tech: z.string().optional(),
    language: z.string().optional(),
    screens: z.array(z.object({
      name: z.string().min(1),
      files: z.array(z.string().min(1)).min(1)
    })).min(1)
  })).min(1)
})

export class AiCardGroupingService {
  static isEnabled(): boolean {
    return process.env.GITHUB_IMPORT_USE_AI === 'true'
  }

  static hasConfig(): boolean {
    return Boolean(this.resolveApiKey())
  }

  private static resolveApiKey(): string | undefined {
    // Priorizar chave do Grok; fallback para OPENAI_API_KEY se não houver
    const key = process.env.GROK_API_KEY || process.env.OPENAI_API_KEY
    
    // Log non-sensitive API key status (development only)
    if (process.env.NODE_ENV === 'development') {
      try {
        const apiKeyPresent = Boolean(key)
        const keyLength = key?.length || 0
        // Log only presence and length (capped for security)
        const cappedLength = keyLength > 0 ? `${keyLength > 20 ? '20+' : keyLength} chars` : '0'
        console.debug('[AiCardGroupingService] API key status:', {
          apiKeyPresent,
          keyLength: cappedLength,
          source: process.env.GROK_API_KEY ? 'GROK_API_KEY' : (process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY' : 'none')
        })
      } catch (err) {
        // Log error but don't fail the function
        console.error('[AiCardGroupingService] Error logging API key status:', err)
      }
    }
    
    return key
  }

  static mode(): 'metadata' | 'full' {
    return process.env.GITHUB_IMPORT_AI_MODE === 'full' ? 'full' : 'metadata'
  }

  private static resolveChatCompletionsUrl(): string {
    const raw = (process.env.OPENAI_BASE_URL || 'https://api.x.ai/v1/chat/completions').trim()
    if (raw.endsWith('/chat/completions')) return raw
    if (raw.endsWith('/v1')) return `${raw}/chat/completions`
    if (raw.endsWith('/')) {
      const noSlash = raw.slice(0, -1)
      if (noSlash.endsWith('/v1')) return `${noSlash}/chat/completions`
    }
    return raw
  }

  private static async callChatCompletions(args: { endpoint: string; apiKey: string; body: any }): Promise<{ content: string }> {
    const res = await fetch(args.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.apiKey}` },
      body: JSON.stringify(args.body)
    })
    const text = await res.text().catch(() => '')
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${text || res.statusText}`)
    let json: any
    try { json = JSON.parse(text) } catch { throw new Error('LLM retornou resposta não-JSON') }
    const content = json?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') throw new Error('LLM retornou resposta inválida')
    return { content }
  }

  /**
   * Normalizes raw AI output to match AiOutputSchema expectations.
   * Handles various LLM response formats by mapping name→title, populating
   * missing descriptions, ensuring proper types, and filtering invalid entries.
   */
  private static normalizeAiOutput(raw: any): any {
    if (!raw || typeof raw !== 'object') {
      return { cards: [] }
    }

    if (raw?.cards && Array.isArray(raw.cards)) {
      const normalizedCards = raw.cards
        .map((card: any, cardIdx: number) => {
          // Map name→title with fallbacks
          const title = card?.title || card?.name || card?.featureName || `Card ${cardIdx + 1}`
          
          // Normalize screens array
          const screensRaw = Array.isArray(card?.screens) ? card.screens : []
          const screens = screensRaw
            .map((s: any, screenIdx: number) => {
              const name = s?.name || s?.layer || s?.key || `Screen ${screenIdx + 1}`
              const files = Array.isArray(s?.files) ? s.files : []
              if (!files.length) return null
              return { name, files }
            })
            .filter(Boolean)

          // Filter out invalid cards (no title or no screens)
          if (!title || !screens.length) return null

          // Build normalized card with required fields
          const normalizedCard: any = {
            title,
            description: card?.description || '',
            screens
          }

          // Add optional fields if present
          if (card?.tech) normalizedCard.tech = String(card.tech)
          if (card?.language) normalizedCard.language = String(card.language)

          // Handle tags if present (coerce to array)
          if (card?.tags !== undefined) {
            if (Array.isArray(card.tags)) {
              normalizedCard.tags = card.tags.map((t: any) => String(t))
            } else if (typeof card.tags === 'string') {
              normalizedCard.tags = [String(card.tags)]
            }
          }

          return normalizedCard
        })
        .filter(Boolean)

      return { cards: normalizedCards }
    }

    return { cards: [] }
  }

  static async refineGrouping(params: {
    repoUrl: string
    detectedTech: string
    detectedLanguage: string
    files: FileMeta[]
    proposedGroups: ProposedGroup[]
  }): Promise<z.infer<typeof AiOutputSchema>> {
    const apiKey = this.resolveApiKey()
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')

    const model = process.env.OPENAI_MODEL || 'grok-4-1-fast-reasoning'
    const endpoint = this.resolveChatCompletionsUrl()
    const mode = this.mode()

    const MAX_FILES = Number(process.env.GITHUB_IMPORT_AI_MAX_FILES || (mode === 'full' ? 400 : 200))
    const MAX_CHARS_PER_FILE = Number(process.env.GITHUB_IMPORT_AI_MAX_CHARS_PER_FILE || (mode === 'full' ? 20000 : 1200))
    const MAX_TOTAL_CHARS = Number(process.env.GITHUB_IMPORT_AI_MAX_TOTAL_CHARS || (mode === 'full' ? 250000 : 120000))

    const filesTrimmed: FileMeta[] = []
    let totalChars = 0
    for (const f of params.files.slice(0, MAX_FILES)) {
      const trimmed = (f.snippet || '').slice(0, MAX_CHARS_PER_FILE)
      if (totalChars + trimmed.length > MAX_TOTAL_CHARS) break
      totalChars += trimmed.length
      filesTrimmed.push({ path: f.path, layer: f.layer, featureName: f.featureName, size: f.size, snippet: trimmed })
    }

    const system = [
      'Você é um arquiteto de software.',
      'Organize arquivos de um repositório em "cards" por funcionalidade:',
      '- 1 card = 1 feature/sistema (ex: Autenticação, Equipe, Pagamentos)',
      '- Cada card tem várias "screens" por camada',
      '- Cada card DEVE ter uma descrição clara e concisa explicando sua funcionalidade',
      '- O output DEVE ser JSON válido, sem markdown.'
    ].join('\n')

    const user = [
      `Repo: ${params.repoUrl}`,
      `Tech: ${params.detectedTech}`,
      `Linguagem: ${params.detectedLanguage}`,
      '',
      'Arquivos:',
      JSON.stringify(filesTrimmed, null, 2),
      '',
      'Grupos sugeridos:',
      JSON.stringify(params.proposedGroups, null, 2),
      '',
      'Retorne JSON com chave "cards". screens[].files deve conter paths exatos.'
    ].join('\n')

    const body = {
      model,
      temperature: 0.2,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_object' }
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        sessionId:'debug-session',
        runId:'pre-fix',
        hypothesisId:'D',
        location:'aiCardGroupingService.ts:refineGrouping:beforeCall',
        message:'Calling LLM for grouping',
        data:{
          mode,
          model,
          endpoint,
          filesTrimmed: filesTrimmed.length,
          totalChars,
          proposedGroups: params.proposedGroups.length
        },
        timestamp:Date.now()
      })
    }).catch(()=>{})
    // #endregion

    let llmContent: string | undefined

    try {
      const { content } = await this.callChatCompletions({ endpoint, apiKey, body })
      llmContent = content

      // Normalizar saída do LLM para o schema esperado (fallbacks para Grok)
      let parsed: any
      try {
        parsed = JSON.parse(content)
      } catch (parseErr: any) {
        throw new Error(`Resposta LLM não é JSON válido: ${String(parseErr?.message || parseErr)}`)
      }

      // Normalize the parsed output using shared helper
      const normalized = this.normalizeAiOutput(parsed)

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'pre-fix',
          hypothesisId:'F',
          location:'aiCardGroupingService.ts:refineGrouping:afterLLM',
          message:'LLM returned content',
          data:{
            contentLength: content.length,
            sample: content.slice(0, 400),
            normalizedCards: normalized?.cards?.length || 0
          },
          timestamp:Date.now()
        })
      }).catch(()=>{})
      // #endregion

      return AiOutputSchema.parse(normalized)
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'pre-fix',
          hypothesisId:'E',
          location:'aiCardGroupingService.ts:refineGrouping:error',
          message:'LLM call failed, falling back',
          data:{
            error: String(err?.message || err),
            contentSample: llmContent ? llmContent.slice(0, 400) : null,
            contentLength: llmContent ? llmContent.length : null
          },
          timestamp:Date.now()
        })
      }).catch(()=>{})
      // #endregion
      const msg = String(err?.message || err)
      if (msg.includes('response_format') || msg.includes('json_object') || msg.includes('LLM HTTP 400')) {
        const body2 = {
          model,
          temperature: 0.2,
          messages: [{ role: 'system', content: `${system}\n\nRetorne APENAS JSON válido.` }, { role: 'user', content: user }]
        }
        const { content } = await this.callChatCompletions({ endpoint, apiKey, body: body2 })
        
        // Parse and normalize the retry response using the same helper
        let retryParsed: any
        try {
          retryParsed = JSON.parse(content)
        } catch (parseErr: any) {
          throw new Error(`Resposta LLM (retry) não é JSON válido: ${String(parseErr?.message || parseErr)}`)
        }
        
        const retryNormalized = this.normalizeAiOutput(retryParsed)
        return AiOutputSchema.parse(retryNormalized)
      }
      throw err
    }
  }
}

