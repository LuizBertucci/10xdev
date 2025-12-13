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
      files: z.array(z.string().min(1)).min(1),
    })).min(1),
  })).min(1),
})

export class AiCardGroupingService {
  static isEnabled(): boolean {
    return process.env.GITHUB_IMPORT_USE_AI === 'true'
  }

  static hasConfig(): boolean {
    return Boolean(process.env.OPENAI_API_KEY)
  }

  static mode(): 'metadata' | 'full' {
    return (process.env.GITHUB_IMPORT_AI_MODE === 'full' ? 'full' : 'metadata')
  }

  private static resolveChatCompletionsUrl(): string {
    // Aceita tanto base URL quanto endpoint completo.
    // Exemplos:
    // - https://api.openai.com/v1 -> https://api.openai.com/v1/chat/completions
    // - https://api.x.ai/v1 -> https://api.x.ai/v1/chat/completions
    // - https://api.openai.com/v1/chat/completions -> (mantém)
    const raw = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions').trim()

    if (raw.endsWith('/chat/completions')) return raw

    // Se é base /v1 (ou algo equivalente), anexar o path.
    if (raw.endsWith('/v1')) return `${raw}/chat/completions`

    // Se terminou com '/', remove e tenta
    if (raw.endsWith('/')) {
      const noSlash = raw.slice(0, -1)
      if (noSlash.endsWith('/v1')) return `${noSlash}/chat/completions`
    }

    // Caso genérico: assume que o usuário passou um endpoint já utilizável
    // (ex: proxy interno). Não tenta adivinhar.
    return raw
  }

  private static async callChatCompletions(args: {
    endpoint: string
    apiKey: string
    body: any
  }): Promise<{ content: string }> {
    const res = await fetch(args.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify(args.body),
    })

    const text = await res.text().catch(() => '')

    if (!res.ok) {
      throw new Error(`LLM HTTP ${res.status}: ${text || res.statusText}`)
    }

    let json: any
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error('LLM retornou resposta não-JSON')
    }

    const content = json?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('LLM retornou resposta inválida (sem message.content)')
    }

    return { content }
  }

  /**
   * Refina o agrupamento de cards/screens com IA.
   *
   * Modos:
   * - metadata: manda metadados + snippets pequenos
   * - full: manda conteúdo completo (com cortes de segurança para não estourar limites do provedor)
   */
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

    // Limites de payload (hard limit inevitável). Ajustável via env.
    const mode = this.mode()
    const MAX_FILES = Number(process.env.GITHUB_IMPORT_AI_MAX_FILES || (mode === 'full' ? 400 : 200))
    const MAX_CHARS_PER_FILE = Number(process.env.GITHUB_IMPORT_AI_MAX_CHARS_PER_FILE || (mode === 'full' ? 20000 : 1200))
    const MAX_TOTAL_CHARS = Number(process.env.GITHUB_IMPORT_AI_MAX_TOTAL_CHARS || (mode === 'full' ? 250000 : 120000))

    const filesTrimmed: FileMeta[] = []
    let totalChars = 0
    for (const f of params.files.slice(0, MAX_FILES)) {
      const raw = f.snippet || ''
      const trimmed = raw.slice(0, MAX_CHARS_PER_FILE)
      const next = {
        path: f.path,
        layer: f.layer,
        featureName: f.featureName,
        size: f.size,
        snippet: trimmed,
      }
      if (totalChars + trimmed.length > MAX_TOTAL_CHARS) break
      totalChars += trimmed.length
      filesTrimmed.push(next)
    }

    const system = [
      'Você é um arquiteto de software e editor de documentação técnica.',
      'Sua tarefa é organizar arquivos de um repositório em "cards" por funcionalidade, seguindo o padrão:',
      '- 1 card = 1 feature/sistema (ex: Autenticação, Equipe, Pagamentos)',
      '- Cada card tem várias "screens" por camada (Backend Routes/Controller/Service/Model, Frontend Hook/Component/Page, etc).',
      '- Evite 1 card por arquivo. Prefira agrupar por domínio/funcionalidade.',
      '- O output DEVE ser JSON válido, sem markdown.',
    ].join('\n')

    const user = [
      `Repo: ${params.repoUrl}`,
      `Tech detectada: ${params.detectedTech}`,
      `Linguagem detectada: ${params.detectedLanguage}`,
      '',
      'Arquivos (metadados + snippet pequeno quando disponível):',
      JSON.stringify(filesTrimmed, null, 2),
      '',
      'Sugestão inicial (heurística) de grupos por feature (pode mudar):',
      JSON.stringify(params.proposedGroups, null, 2),
      '',
      'Regras do output:',
      '- Retorne um objeto JSON com a chave "cards".',
      '- Cada card deve ter: title, description, screens[].',
      '- screens[].files deve conter paths exatamente como fornecidos.',
      '- Não invente arquivos que não existem.',
      '- Títulos e descrições em português, bem "humanos" (estilo de cards já existentes).',
    ].join('\n')

    const body = {
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    }

    // Alguns providers OpenAI-compatible (incl. alguns gateways) não suportam response_format.
    // Estratégia: tenta com JSON mode; se falhar, tenta novamente sem response_format e reforça a instrução no prompt.
    try {
      const { content } = await this.callChatCompletions({ endpoint, apiKey, body })
      const parsed = JSON.parse(content)
      return AiOutputSchema.parse(parsed)
    } catch (err: any) {
      const msg = String(err?.message || err)
      const shouldRetryWithoutJsonMode =
        msg.includes('response_format') ||
        msg.includes('json_object') ||
        msg.includes('Invalid') ||
        msg.includes('unsupported') ||
        msg.includes('LLM HTTP 400')

      if (!shouldRetryWithoutJsonMode) throw err

      const body2 = {
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system + '\n\nIMPORTANTE: Retorne APENAS JSON válido, sem markdown.' },
          { role: 'user', content: user + '\n\nIMPORTANTE: Retorne APENAS JSON válido, sem markdown.' },
        ],
      }

      const { content } = await this.callChatCompletions({ endpoint, apiKey, body: body2 })
      const parsed = JSON.parse(content)
      return AiOutputSchema.parse(parsed)
    }
  }
}


