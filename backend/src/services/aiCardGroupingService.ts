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
    return Boolean(process.env.OPENAI_API_KEY)
  }

  static mode(): 'metadata' | 'full' {
    return process.env.GITHUB_IMPORT_AI_MODE === 'full' ? 'full' : 'metadata'
  }

  private static resolveChatCompletionsUrl(): string {
    const raw = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions').trim()
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

  static async refineGrouping(params: {
    repoUrl: string
    detectedTech: string
    detectedLanguage: string
    files: FileMeta[]
    proposedGroups: ProposedGroup[]
  }): Promise<z.infer<typeof AiOutputSchema>> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
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

    try {
      const { content } = await this.callChatCompletions({ endpoint, apiKey, body })
      return AiOutputSchema.parse(JSON.parse(content))
    } catch (err: any) {
      const msg = String(err?.message || err)
      if (msg.includes('response_format') || msg.includes('json_object') || msg.includes('LLM HTTP 400')) {
        const body2 = {
          model,
          temperature: 0.2,
          messages: [{ role: 'system', content: `${system}\n\nRetorne APENAS JSON válido.` }, { role: 'user', content: user }]
        }
        const { content } = await this.callChatCompletions({ endpoint, apiKey, body: body2 })
        return AiOutputSchema.parse(JSON.parse(content))
      }
      throw err
    }
  }
}

