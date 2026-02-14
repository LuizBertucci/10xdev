import path from 'path'
import { z } from 'zod'
import { MacroCategory } from '@/types/MacroCategory'
import { ContentType } from '@/types/cardfeature'
import { FEATURE_SEMANTIC_MAP } from '@/constants/featureSemantics'

function extractImportsFromSnippet(snippet?: string): string[] {
  if (!snippet) return []
  const out: string[] = []
  const re = /import\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(snippet)) !== null) {
    out.push(m[1] || m[2] || '')
  }
  return [...new Set(out.filter(Boolean))].slice(0, 10)
}

function extractExportsFromSnippet(snippet?: string): string[] {
  if (!snippet) return []
  const out: string[] = []
  const re1 = /export\s+(?:async\s+)?(?:function|class|const)\s+(\w+)/g
  let m: RegExpExecArray | null
  while ((m = re1.exec(snippet)) !== null) {
    if (m[1]) out.push(m[1])
  }
  const re2 = /export\s+\{([^}]+)\}/g
  while ((m = re2.exec(snippet)) !== null) {
    const names = (m[1] || '')
      .split(',')
      .map(s => (s.trim().split(/\s+as\s+/)[0] ?? '').trim())
      .filter(Boolean)
    out.push(...names)
  }
  return [...new Set(out.filter(Boolean))].slice(0, 12)
}

function resolveImportToFilePath(spec: string, fromPath: string, allPaths: string[]): string | null {
  const trimmed = spec.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    const fromDir = fromPath.split('/').slice(0, -1).join('/')
    const resolved = path.posix.normalize(fromDir + '/' + trimmed)
    const candidates = [
      resolved + '.ts',
      resolved + '.tsx',
      resolved + '.js',
      resolved + '.jsx',
      resolved + '/index.ts',
      resolved + '/index.tsx'
    ]
    for (const c of candidates) {
      const found = allPaths.find(p => p === c)
      if (found) return found
    }
    return null
  }

  if (trimmed.startsWith('@/') || trimmed.startsWith('@')) {
    const suf = trimmed.replace(/^@\/?[^/]*\//, '').replace(/^@\//, '')
    const found = allPaths.find(p => p.endsWith(suf) || p.includes('/' + suf))
    if (found) return found
  }

  const base = trimmed.split('/').pop() || trimmed
  const matches = allPaths.filter(p => p.includes(base))
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]!
  const fromDir = fromPath.split('/').slice(0, -1).join('/')
  const sameDir = matches.find(p => p.startsWith(fromDir + '/'))
  if (sameDir) return sameDir
  const fromParent = fromPath.split('/').slice(0, -2).join('/')
  const sameParent = matches.find(p => p.startsWith(fromParent + '/'))
  if (sameParent) return sameParent
  return matches[0]!
}

function buildImportGraph(files: Array<{ path: string; snippet?: string }>): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()
  const allPaths = files.map(f => f.path)
  const hasJsLike = allPaths.some(p => /\.(ts|tsx|js|jsx)$/.test(p))
  if (!hasJsLike) return graph

  const MAX_EDGES_PER_FILE = 10
  for (const file of files) {
    const imports = extractImportsFromSnippet(file.snippet)
    const resolved = new Set<string>()
    for (const spec of imports) {
      if (spec.includes('node_modules') || (!spec.startsWith('.') && !spec.startsWith('@'))) continue
      const target = resolveImportToFilePath(spec, file.path, allPaths)
      if (target && target !== file.path) {
        resolved.add(target)
        if (resolved.size >= MAX_EDGES_PER_FILE) break
      }
    }
    if (resolved.size > 0) graph.set(file.path, resolved)
  }
  return graph
}

function formatGraphForPrompt(graph: Map<string, Set<string>>): string {
  const lines: string[] = []
  const MAX_LINES = 300
  for (const [from, toSet] of graph) {
    if (lines.length >= MAX_LINES) {
      lines.push('... (grafo truncado)')
      break
    }
    const targets = [...toSet].slice(0, 10)
    if (targets.length > 0) {
      lines.push(`${from} → ${targets.join(', ')}`)
    }
  }
  return lines.join('\n')
}

type NormalizedScreen = { name: string; description: string; files: string[] }

const PATH_PREFIX_TO_CARD: Array<{ match: RegExp | string; title: string; category: string }> = [
  { match: /constants/i, title: 'Constantes e Semântica', category: 'Configuração' },
  { match: /middleware/i, title: 'Middlewares', category: 'Infraestrutura' },
  { match: /database|models|supabase/i, title: 'Camada de Persistência', category: 'Acesso a Dados' },
  { match: /controllers|routes/i, title: 'Endpoints e Rotas API', category: 'APIs REST' },
  { match: /app\/admin|admin\//i, title: 'Painel Admin', category: 'Administrativo' },
  { match: /components/i, title: 'Biblioteca de Componentes UI', category: 'Componentes UI' },
  { match: /scripts|\.claude/i, title: 'Scripts e Ferramentas', category: 'Utilidades' },
  { match: /Dockerfile|docker-compose/i, title: 'Infraestrutura Docker', category: 'DevOps' },
  { match: /package\.json|tsconfig|eslint|\.env/i, title: 'Configuração do Projeto', category: 'Configuração' },
  { match: /hooks/i, title: 'Hooks Customizados', category: 'Hooks e Estado' },
  { match: /services|lib|utils/i, title: 'Serviços e Utilitários', category: 'Utilidades' }
]

/**
 * Last-resort: group missing files by path prefix and create multiple cards.
 * Agrega por (title, category) para evitar múltiplos cards com mesmo título.
 */
function createCardsFromPathGroups(missing: string[]): Array<{ title: string; description: string; category: string; screens: NormalizedScreen[] }> {
  const byPrefix = new Map<string, string[]>()
  for (const p of missing) {
    const segments = p.split('/')
    const prefix = segments.length <= 2 ? 'root' : segments.slice(0, 3).join('/')
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, [])
    byPrefix.get(prefix)!.push(p)
  }
  const byTitleCategory = new Map<string, { title: string; category: string; screens: NormalizedScreen[] }>()
  for (const [prefix, files] of byPrefix) {
    if (files.length === 0) continue
    const pathStr = prefix.toLowerCase()
    const rule = PATH_PREFIX_TO_CARD.find(r =>
      typeof r.match === 'string' ? pathStr.includes(r.match) : r.match.test(prefix)
    )
    const title = rule?.title ?? `Arquivos - ${prefix.split('/').pop() || prefix}`
    const category = rule?.category ?? 'Outros'
    const key = `${title}::${category}`
    if (!byTitleCategory.has(key)) {
      byTitleCategory.set(key, { title, category, screens: [] })
    }
    const screenName = prefix.split('/').pop() || prefix
    byTitleCategory.get(key)!.screens.push({
      name: screenName,
      description: '',
      files
    } as NormalizedScreen)
  }
  return Array.from(byTitleCategory.values()).map(({ title, category, screens }) => ({
    title,
    category,
    description: `Arquivos dos diretórios: ${screens.map(s => s.name).join(', ')}.`,
    screens
  }))
}

/**
 * Builds cards from assignments format: { path: cardTitle }.
 * Guarantees 1:1 coverage — every path maps to exactly one card.
 */
function buildCardsFromAssignments(
  assignments: Record<string, string>,
  allPaths: string[]
): Array<{ title: string; description: string; category: string; screens: NormalizedScreen[] }> {
  const byTitle = new Map<string, string[]>()
  for (const p of allPaths) {
    const title = assignments[p]?.trim() || 'Outros'
    if (!byTitle.has(title)) byTitle.set(title, [])
    byTitle.get(title)!.push(p)
  }
  return Array.from(byTitle.entries()).map(([title, files]) => ({
    title,
    description: `Arquivos organizados por análise do código.`,
    category: title,
    screens: [{ name: 'Arquivos', description: '', files }] as NormalizedScreen[]
  }))
}

interface AiCardFile {
  path: string
  content?: string
}

interface AiCardScreen {
  name: string
  description: string
  files: AiCardFile[]
}

interface AiCard {
  title?: string
  name?: string
  featureName?: string
  description?: string
  category?: string
  tags?: string[] | string | unknown
  tech?: string | unknown
  language?: string | unknown
  macroCategory?: MacroCategory
  screens?: unknown
}

interface AiOutput {
  cards?: AiCard[]
}

/**
 * Remove formatação Markdown de texto (negrito, itálico, links, etc)
 */
function cleanMarkdown(text: string): string {
  if (!text) return text

  return text
    // Remove **negrito**
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove *itálico*
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove __sublinhado__
    .replace(/__([^_]+)__/g, '$1')
    // Remove ~~riscado~~
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove `código inline`
    .replace(/`([^`]+)`/g, '$1')
    // Remove # Headers (##, ###, etc) - apenas no início da linha
    .replace(/^#{1,6}\s+/gm, '')
    // Remove links [texto](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points (-, *, +) no início da linha
    .replace(/^\s*[-*+]\s+/gm, '')
    .trim()
}

type FileMeta = {
  path: string
  size: number
  snippet?: string
  layer?: string
  featureName?: string
}

const AiOutputSchema = z.object({
  cards: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional().default(''),
    category: z.string().optional().default(''),
    tech: z.string().optional(),
    language: z.string().optional(),
    macroCategory: z.nativeEnum(MacroCategory).optional(),
    tags: z.array(z.string()).optional(),
    screens: z.array(z.object({
      name: z.string().min(1),
      description: z.string().optional().default(''),
      files: z.array(z.string().min(1))
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

  private static async callChatCompletions(args: { endpoint: string; apiKey: string; body: Record<string, unknown> }): Promise<{ content: string }> {
    const res = await fetch(args.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.apiKey}` },
      body: JSON.stringify(args.body)
    })
    const text = await res.text().catch((e) => {
      console.error('[AiCardGroupingService] Erro ao ler body da resposta:', e?.message)
      return ''
    })
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${text || res.statusText}`)
    let json: unknown
    try { json = JSON.parse(text) } catch { throw new Error('LLM retornou resposta não-JSON') }
    
    if (!json || typeof json !== 'object') throw new Error('LLM retornou resposta inválida')
    const obj = json as Record<string, unknown>
    if (!obj.choices || !Array.isArray(obj.choices)) throw new Error('LLM retornou resposta inválida')
    if (!obj.choices[0] || typeof obj.choices[0] !== 'object') throw new Error('LLM retornou resposta inválida')
    const choice = obj.choices[0] as Record<string, unknown>
    if (!choice.message || typeof choice.message !== 'object') throw new Error('LLM retornou resposta inválida')
    const message = choice.message as Record<string, unknown>
    const content = message.content
    if (!content || typeof content !== 'string') throw new Error('LLM retornou resposta inválida')
    return { content }
  }

  /**
   * Normalizes raw AI output to match AiOutputSchema expectations.
   * Handles various LLM response formats by mapping name→title, populating
   * missing descriptions, ensuring proper types, and filtering invalid entries.
   */
  private static normalizeAiOutput(raw: unknown): AiOutput {
    if (!raw || typeof raw !== 'object') {
      return { cards: [] }
    }

    const obj = raw as Record<string, unknown>
    if (obj?.cards && Array.isArray(obj.cards)) {
      const normalizedCards = obj.cards
        .map((card: unknown, cardIdx: number) => {
          if (!card || typeof card !== 'object') return null
          const cardObj = card as AiCard
          // Map name→title with fallbacks
          const title = cleanMarkdown(cardObj?.title || cardObj?.name || cardObj?.featureName || `Card ${cardIdx + 1}`)

          // Normalize screens array
          const screensRaw = Array.isArray(cardObj?.screens) ? cardObj.screens : []
          const screens = screensRaw
            .map((s: unknown, screenIdx: number) => {
              const screen = s as AiCardScreen & { files?: Array<string | { path?: string }> }
              const name = cleanMarkdown(screen?.name || `Screen ${screenIdx + 1}`)
              const description = cleanMarkdown(screen?.description || '')
              const rawFiles = Array.isArray(screen?.files) ? screen.files : []
              const files = rawFiles.map((f: unknown) =>
                typeof f === 'string' ? f : (f as { path?: string })?.path
              ).filter((p): p is string => Boolean(p))
              return { name, description, files }
            })
            .filter(s => s.name.length > 0)

          // Filter out invalid cards (no title or no screens)
          if (!title || !screens.length) return null

          // Build normalized card with required fields
          const normalizedCard: AiCard = {
            title,
            description: cleanMarkdown(cardObj?.description || ''),
            category: cleanMarkdown(String(cardObj?.category || (Array.isArray(cardObj?.tags) ? cardObj.tags[0] : 'Geral'))),
            screens: screens as unknown as AiCardScreen[]
          }

          // Add optional fields if present
          if (cardObj?.tech) (normalizedCard as { tech?: string }).tech = String(cardObj.tech)
          if (cardObj?.language) (normalizedCard as { language?: string }).language = String(cardObj.language)
          if (cardObj?.macroCategory) (normalizedCard as { macroCategory?: MacroCategory }).macroCategory = cardObj.macroCategory as MacroCategory

          // Handle tags if present (coerce to array)
          if (cardObj?.tags !== undefined) {
            if (Array.isArray(cardObj.tags)) {
              (normalizedCard as { tags?: string[] }).tags = cardObj.tags.map((t: unknown) => String(t))
            } else if (typeof cardObj.tags === 'string') {
              (normalizedCard as { tags?: string[] }).tags = [String(cardObj.tags)]
            }
          }

          return normalizedCard
        })
        .filter((c): c is AiCard => c !== null)

      return { cards: normalizedCards }
    }

    return { cards: [] }
  }

  /** Mescla cards com título normalizado idêntico. Evita duplicatas da IA ou fallback. */
  private static coalesceCardsByTitle(cards: AiCard[]): AiCard[] {
    const byTitle = new Map<string, AiCard[]>()
    const normalizeTitle = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim()
    for (const c of cards) {
      const key = normalizeTitle(c.title || '')
      if (!byTitle.has(key)) byTitle.set(key, [])
      byTitle.get(key)!.push(c)
    }
    return Array.from(byTitle.values()).map(group => {
      if (group.length === 1) return group[0]!
      const allScreens = new Map<string, { desc: string; files: Set<string> }>()
      for (const card of group) {
        for (const s of (card.screens || []) as Array<{ name?: string; description?: string; files?: string[] }>) {
          const name = s.name || 'Arquivos'
          if (!allScreens.has(name)) allScreens.set(name, { desc: s.description || '', files: new Set() })
          for (const f of s.files || []) allScreens.get(name)!.files.add(f)
        }
      }
      return {
        ...group[0]!,
        screens: Array.from(allScreens.entries()).map(([name, { desc, files }]) =>
          ({ name, description: desc, files: Array.from(files) })
        )
      } as AiCard
    })
  }

  /** Subdivide screens com >25 arquivos em várias screens temáticas. */
  private static expandOversizedScreens(cards: AiCard[]): AiCard[] {
    const MAX_FILES_PER_SCREEN = 25
    const UI_GROUPS: Array<{ pattern: RegExp; name: string }> = [
      { pattern: /(?:button|badge|toggle)/i, name: 'Buttons & Badges' },
      { pattern: /(?:input|select|checkbox|form|label|switch|radio|textarea)/i, name: 'Form Controls' },
      { pattern: /(?:dialog|modal|sheet|popover|dropdown|alert|toast|tooltip|accordion|tabs)/i, name: 'Overlays & Feedback' },
      { pattern: /(?:table|card|skeleton|avatar|separator|scroll)/i, name: 'Layout & Display' }
    ]

    return cards.map(card => {
      const newScreens: Array<{ name: string; description: string; files: string[] }> = []
      const screens = (card.screens || []) as Array<{ name?: string; description?: string; files?: string[] }>

      for (const screen of screens) {
        const files = screen.files || []
        if (files.length <= MAX_FILES_PER_SCREEN) {
          newScreens.push({
            name: screen.name || 'Arquivos',
            description: screen.description || '',
            files
          })
          continue
        }

        const byGroup = new Map<string, string[]>()
        for (const p of files) {
          const base = p.split('/').pop() || p
          let placed = false
          for (const { pattern, name } of UI_GROUPS) {
            if (pattern.test(base)) {
              if (!byGroup.has(name)) byGroup.set(name, [])
              byGroup.get(name)!.push(p)
              placed = true
              break
            }
          }
          if (!placed) {
            const key = 'Outros'
            if (!byGroup.has(key)) byGroup.set(key, [])
            byGroup.get(key)!.push(p)
          }
        }

        for (const [groupName, groupFiles] of byGroup) {
          newScreens.push({ name: groupName, description: '', files: groupFiles })
        }
      }

      return { ...card, screens: newScreens as unknown as AiCardScreen[] }
    })
  }

  /** Agrupa arquivos por prefixo de path (2-3 segmentos) para hints no prompt. */
  private static buildPathGroupingHints(files: FileMeta[]): string {
    const MIN_FILES_FOR_HINT = 8
    const byPrefix = new Map<string, string[]>()
    for (const f of files) {
      const segments = f.path.split('/')
      const prefix = segments.length <= 2 ? 'root' : segments.slice(0, 3).join('/')
      if (!byPrefix.has(prefix)) byPrefix.set(prefix, [])
      byPrefix.get(prefix)!.push(f.path)
    }
    const lines: string[] = []
    for (const [prefix, paths] of byPrefix) {
      if (paths.length < MIN_FILES_FOR_HINT) continue
      const sample = paths.slice(0, 5).join(', ')
      const more = paths.length > 5 ? `... +${paths.length - 5} mais` : ''
      lines.push(`- ${prefix} (${paths.length} arquivos): ${sample}${more}`)
    }
    if (lines.length === 0) return ''
    return [
      '',
      '## Sugestão de Agrupamento por Path (use como guia, não como obrigação)',
      'Grupos com 8+ arquivos no mesmo diretório devem virar UM ÚNICO card com múltiplas screens — NÃO fragmente em vários cards genéricos.',
      '',
      ...lines,
      ''
    ].join('\n')
  }

  /** Consolida cards fragmentados (Configuração*, Skills Claude) em um único card. */
  private static mergeFragmentCards(cards: AiCard[]): AiCard[] {
    const configRe = /^Configuração/i
    const skillsRe = /Skill.*Claude|Configurações.*Agentes Claude/i

    const configIndices = cards.map((c, i) => (configRe.test(c.title || '') ? i : -1)).filter(i => i >= 0)
    const skillsIndices = cards.map((c, i) => (skillsRe.test(c.title || '') ? i : -1)).filter(i => i >= 0)

    const toRemove = new Set<number>()
    const result = [...cards]

    const mergeInto = (targetIdx: number, sourceIndices: number[], targetTitle: string) => {
      if (sourceIndices.length <= 1) return
      const target = result[targetIdx]!
      const allScreens = new Map<string, { description: string; files: Set<string> }>()
      for (const idx of [targetIdx, ...sourceIndices.filter(i => i !== targetIdx)]) {
        const c = result[idx]!
        for (const s of (c.screens || []) as Array<{ name?: string; description?: string; files?: string[] }>) {
          const name = s.name || 'Arquivos'
          if (!allScreens.has(name)) allScreens.set(name, { description: s.description || '', files: new Set() })
          const entry = allScreens.get(name)!
          for (const f of s.files || []) entry.files.add(f)
        }
        if (idx !== targetIdx) toRemove.add(idx)
      }
      target.title = targetTitle
      target.screens = Array.from(allScreens.entries()).map(([name, { description, files }]) => ({
        name,
        description,
        files: Array.from(files)
      })) as unknown as AiCardScreen[]
    }

    if (configIndices.length > 1) {
      mergeInto(configIndices[0]!, configIndices, 'Configuração e Infraestrutura')
    }
    if (skillsIndices.length > 1) {
      mergeInto(skillsIndices[0]!, skillsIndices, 'Skills e Configurações Claude')
    }

    return result.filter((_, i) => !toRemove.has(i))
  }

  /**
   * Retry when initial response missed files: ask for assignments format
   * { "assignments": { path: cardTitle } } — guarantees 1:1 coverage.
   */
  private static async retryWithAssignmentsFormat(args: {
    endpoint: string
    apiKey: string
    model: string
    system: string
    filesTrimmed: FileMeta[]
    allPaths: string[]
    missingCount: number
  }): Promise<{ cards: unknown[] } | null> {
    const { endpoint, apiKey, model, system, allPaths } = args
    const assignmentsUser = [
      '## Formato Obrigatório: assignments',
      '',
      `A resposta anterior não incluiu todos os ${allPaths.length} arquivos.`,
      '',
      'Retorne JSON no formato:',
      '```json',
      '{ "assignments": { "path/completo/arquivo.ts": "Título do Card", ... } }',
      '```',
      '',
      '**Regra anti-duplicação:** Use NO MÁXIMO um título por tipo. Agrupe todos os arquivos relacionados sob o MESMO título.',
      'Ex: todos os components → "Biblioteca de Componentes UI"; todos os hooks → "Hooks Customizados".',
      '',
      'Para CADA path da lista abaixo, indique o título do card ao qual pertence (em português).',
      'O objeto assignments DEVE ter exatamente ' + allPaths.length + ' chaves — uma por arquivo.',
      '',
      '## Lista de paths (obrigatório incluir todos):',
      allPaths.join('\n')
    ].join('\n')

    try {
      const { content } = await this.callChatCompletions({
        endpoint,
        apiKey,
        body: {
          model,
          temperature: 0.1,
          messages: [
            { role: 'system', content: system + '\n\nRetorne APENAS JSON com chave "assignments".' },
            { role: 'user', content: assignmentsUser }
          ],
          response_format: { type: 'json_object' }
        }
      })
      const parsed = JSON.parse(content) as { assignments?: Record<string, string> }
      const assignments = parsed?.assignments
      if (!assignments || typeof assignments !== 'object') {
        console.error('[AiCardGroupingService] Retry assignments: formato inválido')
        return null
      }
      const cards = buildCardsFromAssignments(assignments, allPaths)
      if (cards.length === 0) return null
      return { cards }
    } catch (err) {
      console.error('[AiCardGroupingService] Retry assignments falhou:', err)
      return null
    }
  }

  static async refineGrouping(params: {
    repoUrl: string
    detectedTech: string
    detectedLanguage: string
    files: FileMeta[]
  }): Promise<z.infer<typeof AiOutputSchema>> {
    const apiKey = this.resolveApiKey()
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')

    const model = process.env.OPENAI_MODEL || 'grok-4-1-fast-reasoning'
    const endpoint = this.resolveChatCompletionsUrl()

    // Valores compatíveis com context do Grok 4.1 Fast (~2M tokens)
    const MAX_FILES = Number(process.env.GITHUB_IMPORT_AI_MAX_FILES || 800)
    const MAX_CHARS_PER_FILE = Number(process.env.GITHUB_IMPORT_AI_MAX_CHARS_PER_FILE || 10000)

    const sortedFiles = [...params.files].sort((a, b) => a.path.localeCompare(b.path))
    const batches: FileMeta[][] = []
    if (sortedFiles.length > MAX_FILES) {
      for (let i = 0; i < sortedFiles.length; i += MAX_FILES) {
        batches.push(sortedFiles.slice(i, i + MAX_FILES))
      }
      console.log(`[AiCardGroupingService] Batching: ${sortedFiles.length} arquivos em ${batches.length} lotes`)
    } else {
      batches.push(sortedFiles.slice(0, MAX_FILES))
    }

    const allCards: AiCard[] = []
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batchFiles = batches[batchIdx]!
      const filesTrimmed: FileMeta[] = []
      for (const f of batchFiles) {
        const trimmed = (f.snippet || '').slice(0, MAX_CHARS_PER_FILE)
        const imports = extractImportsFromSnippet(trimmed)
        const exports = extractExportsFromSnippet(trimmed)
        const hints = [
          imports.length ? `// imports: ${imports.join(', ')}` : '',
          exports.length ? `// exports: ${exports.join(', ')}` : ''
        ].filter(Boolean).join('\n')
        filesTrimmed.push({
          path: f.path,
          size: f.size,
          snippet: trimmed + (hints ? `\n\n${hints}` : '')
        })
      }

      const graph = buildImportGraph(filesTrimmed)
      const graphText = formatGraphForPrompt(graph)
      const pathHints = this.buildPathGroupingHints(filesTrimmed)

      const system = [
      'Você é um arquiteto de software especializado em organizar código de repositórios.',
      '',
      '## Tarefa',
      'Organize os arquivos em "cards" por funcionalidade de negócio. Cada card tem uma **category** usada para agrupar cards na interface do projeto.',
      '',
      '## Regras de Negócio (clareza do card)',
      '- Explique a feature em linguagem simples, sem jargões',
      '- Título e descrição devem comunicar o problema que resolve e o benefício gerado',
      '- Não use nomes de arquivos/componentes em título ou descrição',
      '- Pense em quem usa a feature e qual fluxo principal ela habilita',
      '',
      '## Categorização dos Cards',
      '',
      'Cada card DEVE ter um campo "category" que será usado para agrupar cards na interface.',
      '',
      '### Regras de Categorização:',
      '1. A category deve ser um nome CURTO e DESCRITIVO em português (2-4 palavras)',
      '2. Alvo: **5-10 categorias DISTINTAS** para todo o projeto (não 1 por card!)',
      '3. Cards relacionados DEVEM compartilhar a mesma category',
      '4. NÃO use nomes de arquivos/componentes como category',
      '',
      '### Bons exemplos de categorias:',
      '- "Autenticação" (auth controller + auth service + login page)',
      '- "Componentes UI" (buttons, inputs, dialogs, modals)',
      '- "APIs REST" (routes, controllers, middleware)',
      '- "Gestão de Dados" (models, migrations, repositories)',
      '- "Configuração" (env, config files, setup scripts)',
      '- "Hooks e Estado" (React hooks, stores, context)',
      '- "Inteligência Artificial" (LLM services, embeddings, AI integrations)',
      '',
      '### Maus exemplos (EVITAR):',
      '- "Frontend" ou "Backend" (genérico demais - não diz NADA sobre a funcionalidade)',
      '- "Componente de Botão" (muito específico - 1 arquivo = 1 categoria)',
      '- "SyntaxHighlighter" (nome de componente interno, não categoria)',
      '- "Publichome" (nome de arquivo/página, não categoria)',
      '',
      '## Definição de Feature',
      '- Uma feature = uma funcionalidade de negócio completa (backend + frontend + testes da mesma área)',
      '- Features distintas DEVEM virar cards distintos, mesmo que compartilhem keywords no path',
      '',
      '## Regras de Agrupamento',
      '- Agrupe por **coesão semântica**: arquivos da mesma funcionalidade → 1 card',
      '- Arquivos que compartilham >70% dos mesmos imports/exports tendem à mesma feature',
      '- Ex: "Auth Controller" + "Auth Service" + "Login Page" = 1 card "Sistema de Autenticação" (mesma feature)',
      '- Se arquivos estão no mesmo diretório/namespace, provavelmente são da mesma feature',
      '',
      '## Análise de Propósito (exports)',
      '- Use os **exports** (// exports: ...) de cada arquivo para identificar propósito',
      '- Arquivos com exports do mesmo contexto funcional (login, token, session → auth) devem ficar no mesmo card',
      '- Correlacione exports com o FEATURE_SEMANTIC_MAP para identificar boundaries',
      '',
      '## Detecção de Boundaries',
      '- Arquivos que se importam mutuamente tendem à mesma feature',
      '- Grupos com poucas conexões externas são boundaries naturais (payment, notifications)',
      '',
      '## Volume de Cards',
      '- NÃO existe limite máximo ou mínimo de cards',
      '- Crie quantos cards forem necessários para representar as features reais do repositório',
      '- Evite cards com menos de 3 arquivos (exceto features isoladas como server.ts)',
      '',
      '## Anti-Fragmentação (consolidar apenas quando mesma feature)',
      '- Só consolide quando for claramente a MESMA funcionalidade. Ex: "Importação GitHub" e "Agrupamento de Cards" são features distintas → cards distintos.',
      '- **Configuração** (mesma feature): Cards "Configuração Frontend", "Backend", "Template", "Docker", "Projeto" → 1 card "Configuração e Infraestrutura" com screens por camada.',
      '- **Skills Claude** (mesma feature): Cards "Skills N8N", "Skills Desenvolvimento", "Configurações de Agentes Claude" → 1 card "Skills e Configurações Claude" com screens por tipo.',
      '- **Componentes UI**: Se 30+ arquivos de componentes, OBRIGATORIAMENTE use várias screens (Buttons & Badges, Form Controls, Overlays) — NUNCA 1 screen "Arquivos" com tudo.',
      '',
      '## Cobertura Total (OBRIGATÓRIO)',
      '- Analise CADA arquivo da lista fornecida, código a código',
      '- screens[].files deve incluir TODOS os paths — nenhum arquivo pode ficar de fora',
      '- NUNCA omita: constants/* (featureSemantics etc), services/*Validation*, scripts/* — são essenciais.',
      '',
      '## Formato de Saída (JSON)',
      '- title: Nome descritivo em português (ex: "Sistema de Autenticação")',
      '- category: Categoria para agrupamento (2-4 palavras, português, OBRIGATÓRIO)',
      '- description: O que a funcionalidade FAZ (não liste arquivos)',
      '- tech: Tecnologia principal (ex: "React", "Node.js")',
      '- tags: Array de 2-4 tags técnicas complementares',
      '- screens[].name: Nome da camada (ex: "Backend - Controller", "Frontend - Component")',
      '- screens[].files: Paths EXATOS dos arquivos — a união de todos os files deve ser igual à lista completa',
      '',
      '## Tags (metadata secundária)',
      '- NÃO repita a category nas tags',
      '- NÃO inclua a tech principal nas tags (já está no campo tech)',
      '- Use para: tecnologias secundárias, padrões, conceitos',
      '- Exemplos: ["JWT", "OAuth"], ["Tailwind", "Radix"], ["CRUD", "Paginação"]',
      '',
      '## Exemplos de Bons Cards',
      '✅ {',
      '   "title": "Sistema de Autenticação",',
      '   "category": "Autenticação",',
      '   "tech": "Node.js + React",',
      '   "tags": ["JWT", "OAuth", "Session"]',
      ' }',
      '✅ {',
      '   "title": "Biblioteca de Componentes",',
      '   "category": "Componentes UI",',
      '   "tech": "React",',
      '   "tags": ["Radix", "Tailwind", "Acessibilidade"]',
      ' }',
      '✅ {',
      '   "title": "API de Projetos",',
      '   "category": "APIs REST",',
      '   "tech": "Express.js",',
      '   "tags": ["CRUD", "Paginação", "Validação"]',
      ' }',
      '',
      '## Qualidade e Volume',
      '✅ BOM: Quantidade de cards conforme features reais do projeto. Priorize detecção correta de funcionalidades sobre consolidação forçada.',
      '✅ BOM: 5-10 categorias distintas, titles em português',
      '❌ RUIM: Sub-detecção (features distintas em 1 card genérico)',
      '❌ RUIM: Sobre-fragmentação (1 card por arquivo)',
      '❌ RUIM: Nomes de arquivo como category',
      '',
      '## REGRA CRÍTICA: Títulos Únicos',
      '- **NUNCA crie múltiplos cards com o mesmo título**',
      '- Se você detectar que precisa de 2 cards "Componentes", isso é ERRO',
      '- Em vez disso, crie 1 card "Sistema de Componentes UI" ou "Biblioteca de Componentes" com múltiplas abas',
      '- Títulos PROIBIDOS (genéricos e causam fragmentação):',
      '  - "Componentes" → use "Biblioteca de Componentes UI" ou "Sistema de Componentes UI"',
      '  - "Hooks" → use "Hooks Customizados" ou "Utilitários React"',
      '  - "Serviços" ou "Serviços e Utilitários" → use nome específico da feature',
      '  - "Acesso a Banco" → use "Camada de Persistência" ou nome da feature',
      '  - "Scripts e Automação" → use "Build Scripts", "Deploy Automation" ou nome específico',
      '  - "Endpoints API" → use nome do domínio: "API de Autenticação", "API de Produtos"',
      '  - "Configuração" → use "Configuração do Projeto" ou combine com feature relacionada',
      '',
      '- EXEMPLO CORRETO: 20 arquivos de componentes (Button.tsx, Input.tsx, Modal.tsx...)',
      '  → 1 card "Biblioteca de Componentes UI" com abas: "Form Controls", "Layout", "Overlays"',
      '- EXEMPLO ERRADO: 14 cards separados "Componentes #1", "Componentes #2"... NÃO FAÇA',
      '',
      '## Saída',
      'Retorne APENAS JSON válido com a chave "cards".'
    ].join('\n')

    const user = [
      '## ⚠️ REGRA #1 OBRIGATÓRIA: Resumo na Primeira Screen',
      '',
      '**CRÍTICO**: TODO card DEVE ter como primeira screen um "Resumo" com descrição detalhada da feature.',
      '',
      '**Estrutura OBRIGATÓRIA da primeira screen:**',
      '```json',
      '{',
      '  "name": "Resumo",',
      '  "description": "Resumo COMPLETO em 3-5 parágrafos: (1) O que a feature faz, (2) Problema que resolve, (3) Componentes principais, (4) Como funciona",',
      '  "files": []',
      '}',
      '```',
      '',
      '**A descrição do Resumo DEVE ter NO MÍNIMO 200 caracteres.**',
      '',
      '## Regras de Categorização Semântica (keywords no path/nome → mesma category)',
      '',
      Object.entries(FEATURE_SEMANTIC_MAP)
        .map(([feat, kw]) => `- ${feat}: ${kw.slice(0, 6).join(', ')}${kw.length > 6 ? '...' : ''}`)
        .join('\n'),
      '',
      'Arquivos com prefixo comum (ex: supabaseClient + supabaseAdmin) → 1 card. Namespaces: supabase, auth, user, card, github, ai, payment.',
      '',
      '### Regras de Agrupamento:',
      '',
      '1. **Coesão semântica**: Arquivos da mesma funcionalidade → 1 card. Features distintas → cards distintos.',
      '',
      '2. **Organização das Screens**: Agrupe arquivos relacionados em screens temáticas. Resumo obrigatório como primeira screen.',
      '',
      '3. **Re-consolidação Backend/Frontend (mesma feature)**:',
      '   - Se você receber features como "X-backend" e "X-frontend" da MESMA funcionalidade:',
      '     → Crie 1 ÚNICO card "Sistema de X" com screens organizadas por camada',
      '   - Exemplos:',
      '     - "auth-backend" + "auth-frontend" → 1 card "Sistema de Autenticação"',
      '     - "card-backend" + "card-frontend" → 1 card "Sistema de CardFeatures"',
      '   - Organize as screens por camada: "Backend - Controllers", "Frontend - Components", etc',
      '',
      '### Exemplos de Consolidação CORRETA:',
      '',
      '**Exemplo 1: Feature "ui" com 40 arquivos**',
      '```json',
      '{',
      '  "title": "Componentes UI",',
      '  "category": "Componentes UI",',
      '  "description": "Biblioteca completa de componentes reutilizáveis incluindo botões, inputs, dialogs e utilitários de interface.",',
      '  "tags": ["Radix", "Acessibilidade"],',
      '  "screens": [',
      '    { ',
      '      "name": "Resumo", ',
      '      "description": "Biblioteca de componentes reutilizáveis para construção de interfaces. Inclui elementos básicos (botões, badges), controles de formulário (inputs, selects, checkboxes) e overlays (dialogs, modals, sheets). Todos os componentes seguem padrões de acessibilidade e design system.\\n\\nFluxo: Componentes são importados individualmente → Customizados via props → Integrados na UI da aplicação.",',
      '      "files": []',
      '    },',
      '    { "name": "Buttons & Badges", "files": ["button.tsx", "badge.tsx", "toggle.tsx"] },',
      '    { "name": "Form Controls", "files": ["input.tsx", "select.tsx", "checkbox.tsx"] },',
      '    { "name": "Dialogs & Overlays", "files": ["dialog.tsx", "modal.tsx", "sheet.tsx"] }',
      '  ]',
      '}',
      '```',
      '',
      '**Exemplo 2: Feature "hook" com 12 arquivos**',
      '```json',
      '{',
      '  "title": "Hooks Customizados",',
      '  "category": "Hooks e Estado",',
      '  "description": "Hooks React reutilizáveis para autenticação, gerenciamento de estado e integração com APIs.",',
      '  "tags": ["Custom Hooks", "Reatividade"],',
      '  "screens": [',
      '    { ',
      '      "name": "Resumo", ',
      '      "description": "Coleção de hooks React customizados que encapsulam lógica reutilizável. Inclui hooks de autenticação (useAuth, useUser), gerenciamento de dados (useApi, useCardFeatures) e interface (useTheme, useToast).\\n\\nFluxo: Hook é importado no componente → Retorna estado e funções → Componente usa os valores retornados.",',
      '      "files": []',
      '    },',
      '    { "name": "Authentication Hooks", "files": ["useAuth.ts", "useUser.ts"] },',
      '    { "name": "Data Management Hooks", "files": ["useApi.ts", "useCardFeatures.ts"] },',
      '    { "name": "UI Hooks", "files": ["useTheme.ts", "useToast.ts"] }',
      '  ]',
      '}',
      '```',
      '',
      '### Exemplos de Fragmentação INCORRETA (EVITAR):',
      '',
      '❌ **ERRADO** (sobre-fragmentação):',
      '```json',
      '[',
      '  { "title": "Componente de Botão UI", "screens": [...] },',
      '  { "title": "Componente de Input UI", "screens": [...] },',
      '  { "title": "Componente de Dialog UI", "screens": [...] }',
      '  // ... 20 cards separados ❌',
      ']',
      '```',
      '',
      '✅ **CORRETO** (consolidado):',
      '```json',
      '[',
      '  { "title": "Componentes UI", "screens": [',
      '      { "name": "Buttons", ... },',
      '      { "name": "Inputs", ... },',
      '      { "name": "Dialogs", ... }',
      '    ]',
      '  }',
      ']',
      '```',
      '',
      '## Repositório',
      `URL: ${params.repoUrl}`,
      `Tech: ${params.detectedTech}`,
      `Linguagem: ${params.detectedLanguage}`,
      '',
      ...(pathHints ? [pathHints] : []),
      ...(graphText ? [
        '## Grafo de Dependências',
        'Arquivos que se importam tendem à mesma feature. Grupos com poucas conexões externas são boundaries naturais.',
        '',
        graphText,
        ''
      ] : []),
      '## Arquivos para Organizar',
      JSON.stringify(filesTrimmed, null, 2),
      '',
      `## Cobertura Obrigatória (CRÍTICO)`,
      '- Analise CADA arquivo da lista acima, um por um, olhando o código/conteúdo de cada um',
      '- Para CADA arquivo, decida a qual card ele pertence e inclua-o em screens[].files',
      `- A união de todos os screens[].files DEVE conter exatamente os ${filesTrimmed.length} arquivos. Nenhum path pode ficar de fora.`,
      '- Verifique antes de retornar: todo path da lista está em algum card?',
      '',
      '## Instruções',
      '1. Percorra a lista de arquivos e analise o código/conteúdo de cada um',
      '2. Agrupe por feature de negócio, não por camada',
      '3. screens[].files DEVE conter apenas paths EXATOS da lista acima',
      '4. Preencha macroCategory quando possível (Frontend, Backend, Fullstack, DevOps, etc.)',
      '5. VERIFIQUE: todo path da lista está em algum screens[].files? Se faltar um, adicione.',
      '',
      'Retorne o JSON:'
    ].join('\n')

    const body = {
      model,
      temperature: 0.15,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_object' }
    }

    const systemLen = system.length
    const userLen = user.length
    const graphEdgeCount = graph.size
    const totalInputChars = systemLen + userLen

    console.log('[AiCardGroupingService] DIAGNÓSTICO INPUT:', {
      filesEnviados: filesTrimmed.length,
      systemPromptChars: systemLen,
      userPromptChars: userLen,
      totalChars: totalInputChars,
      graphArestas: graphEdgeCount,
      graphVazio: graphEdgeCount === 0
    })

    try {
      const { content } = await this.callChatCompletions({ endpoint, apiKey, body })

      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch (parseErr: unknown) {
        throw new Error(`Resposta LLM não é JSON válido: ${String(parseErr instanceof Error ? parseErr.message : parseErr)}`)
      }

      const rawCards = (parsed as Record<string, unknown>)?.cards
      const rawCount = Array.isArray(rawCards) ? rawCards.length : 0

      const normalized = this.normalizeAiOutput(parsed)
      let cards = this.coalesceCardsByTitle(normalized?.cards ?? [])
      cards = this.expandOversizedScreens(cards)
      cards = this.mergeFragmentCards(cards)
      const normCount = cards.length
      const allPaths = filesTrimmed.map(f => f.path)

      const filesInCards = cards.flatMap(c =>
        (c.screens as Array<{ files?: string[] }>)?.flatMap(s => s.files || []) || []
      )
      const uniqueFilesInCards = new Set(filesInCards)
      const missing = allPaths.filter(p => !uniqueFilesInCards.has(p))

      if (missing.length > 0) {
        const assignmentsResult = await this.retryWithAssignmentsFormat({
          endpoint,
          apiKey,
          model,
          system,
          filesTrimmed,
          allPaths,
          missingCount: missing.length
        })
        if (assignmentsResult) {
          const coalesced = this.coalesceCardsByTitle(assignmentsResult.cards as AiCard[])
          const parsed = AiOutputSchema.parse({ cards: coalesced })
          allCards.push(...(parsed.cards as AiCard[]))
        } else {
          const pathCards = createCardsFromPathGroups(missing)
          const merged = this.coalesceCardsByTitle([...cards, ...pathCards])
          console.warn(
            `[AiCardGroupingService] Retry assignments falhou. Usando fallback path-based: ` +
            `${pathCards.length} cards para ${missing.length} arquivos faltantes.`
          )
          allCards.push(...merged)
        }
      } else {
        console.log('[AiCardGroupingService] DIAGNÓSTICO OUTPUT:', {
        contentLength: content.length,
        rawCardsFromAI: rawCount,
        afterNormalize: normCount,
        filteredByNormalize: rawCount - normCount,
        filesEnviados: filesTrimmed.length,
        filesEmCards: uniqueFilesInCards.size,
        coberturaCompleta: missing.length === 0,
        titulos: cards.map(c => c.title),
        filesPorCard: cards.map(c => {
          const n = (c.screens as Array<{ files?: string[] }>)?.reduce((acc, s) => acc + (s.files?.length || 0), 0) || 0
          return { title: c.title, files: n }
        })
      })

        allCards.push(...cards)
      }
    } catch (err: unknown) {
      console.error('[AiCardGroupingService] Erro LLM:', err instanceof Error ? err.message : String(err))
      const msg = String(err instanceof Error ? err.message : err)
      if (msg.includes('response_format') || msg.includes('json_object') || msg.includes('LLM HTTP 400')) {
        const body2 = {
          model,
          temperature: 0.15,
          messages: [{ role: 'system', content: `${system}\n\nRetorne APENAS JSON válido.` }, { role: 'user', content: user }]
        }
        const { content } = await this.callChatCompletions({ endpoint, apiKey, body: body2 })
        
        // Parse and normalize the retry response using the same helper
        let retryParsed: unknown
        try {
          retryParsed = JSON.parse(content)
        } catch (parseErr: unknown) {
          throw new Error(`Resposta LLM (retry) não é JSON válido: ${String(parseErr instanceof Error ? parseErr.message : parseErr)}`)
        }
        
        const retryNormalized = this.normalizeAiOutput(retryParsed)
        let retryCards = this.coalesceCardsByTitle(retryNormalized?.cards ?? [])
        retryCards = this.expandOversizedScreens(retryCards)
        retryCards = this.mergeFragmentCards(retryCards)
        const retryAllPaths = filesTrimmed.map(f => f.path)
        const retryInCards = new Set(retryCards.flatMap(c =>
          (c.screens as Array<{ files?: string[] }>)?.flatMap(s => s.files || []) || []
        ))
        const retryMissing = retryAllPaths.filter(p => !retryInCards.has(p))
        if (retryMissing.length > 0) {
          const assignmentsResult = await this.retryWithAssignmentsFormat({
            endpoint,
            apiKey,
            model,
            system,
            filesTrimmed,
            allPaths: retryAllPaths,
            missingCount: retryMissing.length
          })
          if (assignmentsResult) {
            const coalesced = this.coalesceCardsByTitle(assignmentsResult.cards as AiCard[])
            const parsed = AiOutputSchema.parse({ cards: coalesced })
            allCards.push(...(parsed.cards as AiCard[]))
          } else {
            const pathCards = createCardsFromPathGroups(retryMissing)
            const merged = this.coalesceCardsByTitle([...retryCards, ...pathCards])
            console.warn(
              `[AiCardGroupingService] Retry assignments falhou. Fallback path-based: ` +
              `${pathCards.length} cards para ${retryMissing.length} faltantes.`
            )
            allCards.push(...merged)
          }
        } else {
          allCards.push(...retryCards)
        }
      } else {
        throw err
      }
    }
    }
    const finalCards = this.coalesceCardsByTitle(allCards)
    return AiOutputSchema.parse({ cards: finalCards })
  }

  static async generateCardSummary(params: {
    cardTitle: string
    screens: Array<{ name: string; description: string; blocks: Array<{ type: ContentType; content: string; language?: string; title?: string; route?: string }> }>
    tech?: string
    language?: string
  }, customPrompt?: string): Promise<{ summary: string }> {
    console.log('[generateCardSummary] Iniciando...')
    const apiKey = this.resolveApiKey()
    console.log('[generateCardSummary] API Key presente:', Boolean(apiKey))
    
    if (!apiKey) {
      console.error('[generateCardSummary] ERRO: API key não configurada')
      throw new Error('API key não configurada')
    }
    
    const model = process.env.OPENAI_MODEL || 'grok-4-1-fast-reasoning'
    const endpoint = this.resolveChatCompletionsUrl()
    console.log('[generateCardSummary] Model:', model)
    console.log('[generateCardSummary] Endpoint:', endpoint)
    
    const screensContext = params.screens.slice(0, 10).map((screen) => {
      const files = screen.blocks
        .filter(b => b.type === ContentType.CODE)
        .map(b => b.route || b.title || '')
        .filter(Boolean)
        .map(file => `- ${file}`)
        .join('\n')
      return `${screen.name}\n${screen.description}\n\nArquivos:\n${files}`
    }).join('\n\n')

    const system = [
      'Gere um resumo em português (Brasil) seguindo exatamente este formato:',
      '',
      '1) Título (uma linha, só o nome da feature)',
      '2) Linha em branco',
      '3) Descrição curta em 1–2 frases (visão geral + capacidades principais)',
      '4) Linha em branco',
      '5) Categoria e Tecnologias nesse formato:',
      '   - *Categoria:* <categoria>',
      '   - *Tecnologias:* <lista separada por vírgula>',
      '6) Linha em branco',
      '7) Seção "Features" (título literal "Features")',
      '8) Lista de features com bullets (um item por linha, cada linha termina com ponto final)',
      '9) Linha em branco',
      '10) Seção de arquivos com esta formatação:',
      '    ### Arquivos (XX)',
      '    #### Backend',
      '    - `caminho/do/arquivo1`',
      '    ',
      '    #### Frontend',
      '    - `caminho/do/arquivo2`',
      '',
      'Regras:',
      '- Pode usar markdown leve (ex: **negrito**, *itálico*)',
      '- Pode usar bullets nas seções "Features" e "Arquivos"',
      '- Features devem ser objetivas, sem redundâncias (ex: "CRUD completo" já cobre GET/POST/PUT/DELETE/PATCH)',
      '',
      '## Regras de Negócio (clareza do resumo)',
      '- Explique a feature em linguagem simples, sem jargões',
      '- Título e descrição devem comunicar o problema que resolve e o benefício gerado',
      '- Não use nomes de arquivos/componentes no texto',
      '- Pense em quem usa a feature e qual fluxo principal ela habilita',
      '',
      '## Diretrizes do Resumo',
      '- Mantenha o formato atual (título, descrição, categoria/tecnologias, features, arquivos)',
      '- A descrição curta deve ser objetiva e fácil de entender por qualquer pessoa',
      '- As features devem refletir capacidades reais do card, sem detalhes de implementação',
      '- Use linguagem simples, sem jargões',
      '- Na descrição curta, cite o problema que resolve e o benefício gerado',
      '- Em "Arquivos", use backticks e o número XX deve ser exato',
      '- Em "Arquivos", separe Backend e Frontend em subseções e deixe uma linha em branco entre elas',
      '- Não invente arquivos; use apenas os arquivos do card e que apareçam nas abas',
      '- Evite textos longos e redundantes',
      '- Não usar emojis'
    ].join('\n')

    const trimmedPrompt = customPrompt?.trim()
    const user = [
      `Card: ${params.cardTitle}`,
      `Tech: ${params.tech || 'Não informado'}`,
      `Language: ${params.language || 'Não informado'}`,
      '',
      'Screens:',
      screensContext,
      '',
      'Gere o resumo no formato EXATO especificado acima.',
      ...(trimmedPrompt ? ['', 'Instruções adicionais do usuário:', trimmedPrompt] : [])
    ].join('\n')
    
    console.log('[generateCardSummary] Chamando API de IA...')
    const { content } = await this.callChatCompletions({
      endpoint,
      apiKey,
      body: { model, temperature: 0.3, max_tokens: 400, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }
    })
    
    console.log('[generateCardSummary] Resposta recebida da IA, processando...')
    const summary = content
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Validar e corrigir formato do resumo
    let finalSummary = summary

    // Garantir que começa com o título do card
    if (!summary.match(new RegExp(`^${params.cardTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))) {
      finalSummary = `${params.cardTitle}\n\n${summary}`
    }

    // Garantir seção de arquivos com contagem correta
    const fileItems = params.screens
      .filter(s => !/^(resumo|sumário|summary|overview)$/i.test(s.name.trim()))
      .flatMap(s => s.blocks.filter(b => b.type === ContentType.CODE))
      .map(b => b.route || b.title || '')
      .filter(Boolean)

    if (fileItems.length) {
      const uniqueFiles = Array.from(new Set(fileItems))
      const backendFiles = uniqueFiles.filter(file => file.startsWith('backend/'))
      const frontendFiles = uniqueFiles.filter(file => file.startsWith('frontend/'))
      const otherFiles = uniqueFiles.filter(
        file => !file.startsWith('backend/') && !file.startsWith('frontend/')
      )
      const filesSection = [
        `### Arquivos (${uniqueFiles.length})`,
        ...(backendFiles.length
          ? ['#### Backend', ...backendFiles.map(file => `- \`${file}\``)]
          : []),
        ...(backendFiles.length && frontendFiles.length ? [''] : []),
        ...(frontendFiles.length
          ? ['#### Frontend', ...frontendFiles.map(file => `- \`${file}\``)]
          : []),
        ...(otherFiles.length
          ? ['#### Outros', ...otherFiles.map(file => `- \`${file}\``)]
          : [])
      ].join('\n')

      if (!finalSummary.match(/^###\s+Arquivos\s*\(\d+\)/im)) {
        finalSummary += `\n\n${filesSection}`
      }
    }

    console.log('[generateCardSummary] Resumo processado:', finalSummary?.substring(0, 100) + '...')
    return { summary: finalSummary }
  }
}
