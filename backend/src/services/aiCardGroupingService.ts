import { randomUUID } from 'crypto'
import { ContentType, CardType, Visibility } from '@/types/cardfeature'
import type { CardFeatureScreen, ContentBlock, CreateCardFeatureRequest } from '@/types/cardfeature'
import { FileEntry } from './githubService'

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
  screens?: unknown
}

interface AiOutput {
  cards?: AiCard[]
}

// ================================================
// FILTER CONSTANTS
// ================================================

const CODE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw', '.java', '.kt', '.kts',
  '.go', '.rs', '.rb', '.php',
  '.c', '.cpp', '.cc', '.h', '.hpp',
  '.cs', '.swift', '.vue', '.svelte',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.toml',
  '.md', '.mdx', '.sql',
  '.sh', '.bash', '.zsh',
  '.dockerfile', '.env'
]

const IGNORED_DIRS = [
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.venv', 'venv', '.idea', '.vscode', 'coverage', '.cache', '.turbo',
  'vendor', '.yarn', '.pnpm', 'out', '.output', 'target', 'bin', 'obj',
  '__tests__', '__mocks__', 'test', 'tests', 'spec', 'specs', 'e2e',
  'cypress', 'playwright', '.github', '.husky'
]

const IGNORED_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store',
  'thumbs.db', '.gitignore', '.gitattributes', '.npmrc', '.nvmrc',
  '.prettierrc', '.prettierignore', '.eslintrc', '.eslintrc.js',
  '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs',
  'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
  'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.mjs',
  'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js',
  'postcss.config.mjs', '.env.example', '.env.local', '.env.development',
  '.env.production', 'LICENSE', 'LICENSE.md', 'CHANGELOG.md',
  'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.editorconfig'
]

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.pyw': 'python',
  '.java': 'java', '.kt': 'kotlin', '.kts': 'kotlin',
  '.go': 'go', '.rs': 'rust', '.rb': 'ruby', '.php': 'php',
  '.c': 'c', '.cpp': 'cpp', '.cc': 'cpp', '.h': 'c', '.hpp': 'cpp',
  '.cs': 'csharp', '.swift': 'swift',
  '.vue': 'vue', '.svelte': 'svelte',
  '.html': 'html', '.htm': 'html',
  '.css': 'css', '.scss': 'scss', '.sass': 'sass', '.less': 'less',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
  '.md': 'markdown', '.mdx': 'markdown',
  '.sql': 'sql', '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
  '.dockerfile': 'dockerfile', '.env': 'plaintext'
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
            .map((s:unknown, screenIdx: number) => {
              const screen = s as AiCardScreen
              const name = cleanMarkdown(screen?.name || `Screen ${screenIdx + 1}`)
              const description = cleanMarkdown(screen?.description || '')
              const files = Array.isArray(screen?.files) ? screen.files : []
              if (!files.length) return null
              return { name, description, files }
            })
            .filter(Boolean)

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

  // ================================================
  // FILTER HELPERS
  // ================================================

  static getFileExtension(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    if (fileName.toLowerCase() === 'dockerfile') return '.dockerfile'
    if (fileName.startsWith('.env')) return '.env'
    const lastDot = filePath.lastIndexOf('.')
    if (lastDot === -1) return ''
    return filePath.substring(lastDot).toLowerCase()
  }

  static getLanguageFromExtension(ext: string): string {
    return EXTENSION_TO_LANGUAGE[ext] || 'plaintext'
  }

  static shouldIncludeFile(filePath: string): boolean {
    const parts = filePath.split('/')
    for (const part of parts) {
      if (IGNORED_DIRS.includes(part.toLowerCase())) return false
    }
    const fileName = parts[parts.length - 1] || ''
    if (IGNORED_FILES.includes(fileName)) return false
    return CODE_EXTENSIONS.includes(this.getFileExtension(filePath))
  }

  // ================================================
  // BUILD FUNCTIONS
  // ================================================

  static createContentBlock(file: FileEntry, order: number): ContentBlock {
    const ext = this.getFileExtension(file.path)
    return {
      id: randomUUID(),
      type: ContentType.CODE,
      content: file.content,
      language: this.getLanguageFromExtension(ext),
      title: file.path.split('/').pop() || file.path,
      route: file.path,
      order
    }
  }

  static buildCard(
    featureName: string,
    screens: CardFeatureScreen[],
    tech: string,
    lang: string,
    _featureFiles: FileEntry[],
    aiOverrides?: { title: string; description?: string; tech?: string; language?: string; category?: string; tags?: string[] }
  ): CreateCardFeatureRequest {
    return {
      title: aiOverrides?.title ? cleanMarkdown(aiOverrides.title) : featureName,
      description: cleanMarkdown(aiOverrides?.description || ''),
      tech: aiOverrides?.tech || tech,
      language: aiOverrides?.language || lang,
      content_type: ContentType.CODE,
      card_type: CardType.CODIGOS,
      category: aiOverrides?.category || featureName,
      tags: aiOverrides?.tags || [],
      visibility: Visibility.UNLISTED,
      screens
    }
  }

  static addVisaoGeralScreen(card: CreateCardFeatureRequest): CreateCardFeatureRequest {
    const allFiles = card.screens
      .flatMap(s => s.blocks
        .filter(b => b.route && b.type === ContentType.CODE)
        .map(b => b.route!)
      )
      .filter(Boolean)
      .filter(f => {
        const excludePatterns = ['.md', '.claude/', '.clinerules/', '.cursor/', '.github/']
        return !excludePatterns.some(p => f.includes(p))
      })
    const summaryBlock: ContentBlock = {
      id: randomUUID(),
      type: ContentType.TEXT,
      content: `${card.description}\n\nArquivos (${allFiles.length}):\n${allFiles.map(f => f.split('/').pop()).join(', ')}`,
      order: 0
    }
    const summaryScreen: CardFeatureScreen = {
      name: 'Visão Geral',
      description: card.description,
      route: '',
      blocks: [summaryBlock]
    }
    return {
      ...card,
      screens: [summaryScreen, ...card.screens]
    }
  }

  // ================================================
  // IA - GENERATE CARD GROUPS (REPO INTEIRO - SEM LIMITS)
  // ================================================

  /** Gera cards via IA enviando o repositório INTEIRO sem limits.
   *  Usa Grok 4 Fast com 2M token context window. */
  static async generateCardGroupsFromRepo(
    files: FileEntry[],
    repoUrl: string,
    options?: {
      useAi?: boolean
      onProgress?: (update: { step: string; progress?: number; message?: string }) => void
      onCardReady?: (card: CreateCardFeatureRequest) => Promise<void>
    }
  ): Promise<{ cards: CreateCardFeatureRequest[]; filesProcessed: number; aiUsed: boolean; aiCardsCreated: number }> {
    const notify = (step: string, progress: number, message: string) =>
      options?.onProgress?.({ step, progress, message })

    const emitCard = async (card: CreateCardFeatureRequest) => {
      if (options?.onCardReady) {
        try { await options.onCardReady(card) }
        catch (err) { console.error(`Erro ao criar card "${card.title}":`, err) }
      }
    }

    const useAi = options?.useAi !== false && this.isEnabled() && this.hasConfig()

    if (!useAi) {
      notify('generating_cards', 30, 'Criando card único sem IA...')
      const allBlocks = files.map((file, idx) => this.createContentBlock(file, idx))
      const defaultScreen: CardFeatureScreen = {
        name: 'Código',
        description: `${files.length} arquivos do repositório`,
        route: '',
        blocks: allBlocks
      }
      const card = this.buildCard('misc', [defaultScreen], 'General', 'typescript', files)
      const cardWithVisaoGeral = this.addVisaoGeralScreen(card)
      await emitCard(cardWithVisaoGeral)
      return { cards: [cardWithVisaoGeral], filesProcessed: files.length, aiUsed: false, aiCardsCreated: 0 }
    }

    const apiKey = this.resolveApiKey()
    if (!apiKey) {
      throw new Error('API key não configurada')
    }

    const model = process.env.OPENAI_MODEL || 'grok-4-fast'
    const endpoint = this.resolveChatCompletionsUrl()

    notify('ai_preparing', 10, 'Preparando dados para IA...')

    const fileList = files.map(f => ({
      path: f.path,
      size: f.size,
      content: f.content
    }))

    const systemPrompt = [
      'Você é um arquiteto de software especializado em organizar código de repositórios.',
      '',
      '## Tarefa',
      'Analise o repositório completo e organize os arquivos em "cards" por funcionalidade de negócio. Cada card representa uma feature coesa.',
      '',
      '## Regras de Categorização',
      '- Category deve ter 2-4 palavras em português (ex: "Autenticação", "Componentes UI", "APIs REST")',
      '- Target: 5-15 categorias DISTINTAS para todo o projeto',
      '- Cards relacionados DEVEM compartilhar a mesma category',
      '',
      '## Regras de Agrupamento',
      '- AGRUPE TUDO relacionado em 1 card só',
      '- Ex: "auth controller" + "auth service" + "login page" = 1 card "Sistema de Autenticação"',
      '- Não fragmente: 1 card pode ter dozens de arquivos se são da mesma feature',
      '',
      '## Formato de Saída (JSON)',
      'Retorne APENAS JSON válido com estrutura:',
      '{',
      '  "cards": [',
      '    {',
      '      "title": "Nome da Feature",',
      '      "category": "Categoria",',
      '      "description": "O que a feature faz",',
      '      "tech": "Tecnologia principal",',
      '      "tags": ["tag1", "tag2"],',
      '      "screens": [',
      '        { "name": "Screen Name", "description": "...", "files": ["path1", "path2"] }',
      '      ]',
      '    }',
      '  ]',
      '}'
    ].join('\n')

    const userPrompt = [
      `## Repositório`,
      `URL: ${repoUrl}`,
      `Total de arquivos: ${files.length}`,
      '',
      '## Arquivos do Repositório (COMPLETO)',
      JSON.stringify(fileList, null, 2),
      '',
      '## Instruções',
      '1. Analise TODOS os arquivos para entender funcionalidades',
      '2. Agrupe por feature de negócio',
      '3. screens[].files deve conter APENAS paths da lista acima',
      '4. Cada card deve ter múltiplas screens organizadas por tipo',
      '',
      'Retorne o JSON:'
    ].join('\n')

    notify('ai_analyzing', 30, '🤖 IA analisando repositório completo...')

    const body = {
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    }

    try {
      const { content } = await this.callChatCompletions({ endpoint, apiKey, body })
      notify('ai_processing', 70, 'Processando resposta da IA...')

      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch {
        throw new Error('Resposta da IA não é JSON válido')
      }

      const normalized = this.normalizeAiOutput(parsed)
      const aiCards = normalized.cards || []

      notify('ai_building', 90, `🤖 ${aiCards.length} cards gerados pela IA`)

      const fileMap = new Map<string, FileEntry>()
      files.forEach(f => fileMap.set(f.path, f))

      const resultCards: CreateCardFeatureRequest[] = []

      for (const aiCard of aiCards) {
        const screens: CardFeatureScreen[] = []

        const rawScreens = aiCard.screens
        const screenArray = Array.isArray(rawScreens) ? rawScreens : []

        for (const screen of screenArray) {
          const screenObj = screen as AiCardScreen
          const blocks: ContentBlock[] = []

          const screenFiles = screenObj.files || []
          for (const fileItem of screenFiles) {
            const filePath = typeof fileItem === 'string' ? fileItem : fileItem.path
            const file = fileMap.get(filePath)
            if (file) {
              blocks.push(this.createContentBlock(file, blocks.length))
            }
          }

          if (blocks.length > 0) {
            screens.push({
              name: screenObj.name || 'Screen',
              description: screenObj.description || '',
              route: '',
              blocks
            })
          }
        }

        if (screens.length > 0) {
          const cardOverrides: { title: string; description?: string; category?: string; tags?: string[] } = {
            title: aiCard.title || 'Card',
            description: aiCard.description || '',
            tags: Array.isArray(aiCard.tags) ? aiCard.tags : []
          }
          if (aiCard.category) {
            cardOverrides.category = aiCard.category
          }
          const card = this.buildCard(
            aiCard.category || 'misc',
            screens,
            String(aiCard.tech || 'General'),
            String(aiCard.language || 'typescript'),
            files,
            cardOverrides
          )
          const cardWithVisaoGeral = this.addVisaoGeralScreen(card)
          resultCards.push(cardWithVisaoGeral)
          await emitCard(cardWithVisaoGeral)
        }
      }

      const filesProcessed = resultCards.reduce((sum, c) => sum + c.screens.reduce((s, sc) => s + sc.blocks.length, 0), 0)
      return { cards: resultCards, filesProcessed, aiUsed: true, aiCardsCreated: resultCards.length }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('response_format') || msg.includes('json_object') || msg.includes('LLM HTTP 400')) {
        const body2 = {
          model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: `${systemPrompt}\n\nRetorne APENAS JSON válido.` },
            { role: 'user', content: userPrompt }
          ]
        }
        const { content } = await this.callChatCompletions({ endpoint, apiKey, body: body2 })
        
        const parsed = JSON.parse(content)
        const normalized = this.normalizeAiOutput(parsed)
        
        // Same processing as above - simplified for retry
        const fileMap = new Map<string, FileEntry>()
        files.forEach(f => fileMap.set(f.path, f))
        
        const resultCards: CreateCardFeatureRequest[] = []
        for (const aiCard of normalized.cards || []) {
          const screens: CardFeatureScreen[] = []
          const rawScreens = aiCard.screens
          const screenArray = Array.isArray(rawScreens) ? rawScreens : []
          for (const screen of screenArray) {
            const screenObj = screen as AiCardScreen
            const blocks: ContentBlock[] = []
            const screenFiles = screenObj.files || []
            for (const fileItem of screenFiles) {
              const filePath = typeof fileItem === 'string' ? fileItem : fileItem.path
              const file = fileMap.get(filePath)
              if (file) blocks.push(this.createContentBlock(file, blocks.length))
            }
            if (blocks.length > 0) {
              screens.push({ name: screenObj.name || 'Screen', description: screenObj.description || '', route: '', blocks })
            }
          }
          if (screens.length > 0) {
            const cardOverrides: { title: string; description?: string; category?: string; tags?: string[] } = {
              title: aiCard.title || 'Card',
              description: aiCard.description || '',
              tags: Array.isArray(aiCard.tags) ? aiCard.tags : []
            }
            if (aiCard.category) {
              cardOverrides.category = aiCard.category
            }
            const card = this.buildCard(aiCard.category || 'misc', screens, String(aiCard.tech || 'General'), String(aiCard.language || 'typescript'), files, cardOverrides)
            const cardWithVisaoGeral = this.addVisaoGeralScreen(card)
            resultCards.push(cardWithVisaoGeral)
            await emitCard(cardWithVisaoGeral)
          }
        }
        const filesProcessedRetry = resultCards.reduce((sum, c) => sum + c.screens.reduce((s, sc) => s + sc.blocks.length, 0), 0)
        return { cards: resultCards, filesProcessed: filesProcessedRetry, aiUsed: true, aiCardsCreated: resultCards.length }
      }
      throw err
    }
  }

}
