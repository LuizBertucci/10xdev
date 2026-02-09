import { z } from 'zod'
import { MacroCategory } from '@/types/MacroCategory'
import { ContentType } from '@/types/cardfeature'

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
    category: z.string().optional().default(''),
    tech: z.string().optional(),
    language: z.string().optional(),
    macroCategory: z.nativeEnum(MacroCategory).optional(),
    tags: z.array(z.string()).optional(),
    screens: z.array(z.object({
      name: z.string().min(1),
      description: z.string().optional().default(''),
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

    const filesTrimmed: FileMeta[] = []
    for (const f of params.files.slice(0, MAX_FILES)) {
      const trimmed = (f.snippet || '').slice(0, MAX_CHARS_PER_FILE)
      filesTrimmed.push({ path: f.path, layer: f.layer, featureName: f.featureName, size: f.size, snippet: trimmed })
    }

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
      '## Regras de Agrupamento',
      '- **AGRUPE TUDO relacionado** em 1 card só (não fragmente)',
      '- Ex: "Componente de Botão" + "Componente de Input" = 1 card "Componentes UI", category "Componentes UI"',
      '- Ex: "Auth Controller" + "Auth Service" + "Login Page" = 1 card "Sistema de Autenticação", category "Autenticação"',
      '- Se arquivos estão no mesmo diretório/namespace, provavelmente são da mesma feature',
      '',
      '## Formato de Saída (JSON)',
      '- title: Nome descritivo em português (ex: "Sistema de Autenticação")',
      '- category: Categoria para agrupamento (2-4 palavras, português, OBRIGATÓRIO)',
      '- description: O que a funcionalidade FAZ (não liste arquivos)',
      '- tech: Tecnologia principal (ex: "React", "Node.js")',
      '- tags: Array de 2-4 tags técnicas complementares',
      '- screens[].name: Nome da camada (ex: "Backend - Controller", "Frontend - Component")',
      '- screens[].files: Paths EXATOS dos arquivos da lista fornecida',
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
      '## Qualidade',
      '✅ BOM: 10-20 cards, 5-10 categorias distintas, titles em português',
      '❌ RUIM: 30+ cards, 1 categoria por card, nomes de arquivo como category',
      '',
      '## Saída',
      'Retorne APENAS JSON válido com a chave "cards".'
    ].join('\n')

    const user = [
      '## ⚠️ REGRA #1 OBRIGATÓRIA: Overview na Primeira Screen',
      '',
      '**CRÍTICO**: TODO card DEVE ter como primeira screen um "Overview" com descrição detalhada.',
      '',
      '**Estrutura OBRIGATÓRIA da primeira screen:**',
      '```json',
      '{',
      '  "name": "Overview",',
      '  "description": "Descrição COMPLETA em 3-5 parágrafos: (1) O que é, (2) Problema que resolve, (3) Componentes principais, (4) Como funciona",',
      '  "files": []',
      '}',
      '```',
      '',
      '**A descrição do Overview DEVE ter NO MÍNIMO 200 caracteres.**',
      '',
      '## ⚠️ ATENÇÃO: Consolidação por Namespace',
      '',
      'IMPORTANTE: Os grupos sugeridos abaixo JÁ foram consolidados semanticamente.',
      'Cada grupo representa UMA feature coesa que agrupa múltiplos arquivos relacionados.',
      '',
      '### Regras de Consolidação (OBRIGATÓRIO seguir):',
      '',
      '1. **Features Consolidadas (NÃO dividir)**:',
      '   - "ui" = TODOS os componentes de interface (button, input, dialog, badge, etc)',
      '     → Crie 1 card "Componentes UI" com screens organizadas por tipo',
      '   - "hook" = TODOS os hooks customizados (useAuth, useApi, useForm, etc)',
      '     → Crie 1 card "Hooks Customizados" com screens por hook',
      '   - "docs" = TODA a documentação (README, guides, API docs, etc)',
      '     → Crie 1 card "Documentação" com screens por tópico',
      '   - "skill" = TODAS as skills n8n',
      '     → Crie 1 card "Skills n8n" com screens por skill',
      '   - "utils" = TODOS os utilitários',
      '     → Crie 1 card "Utilitários" com screens por categoria',
      '   - "config" = TODAS as configurações',
      '     → Crie 1 card "Configurações" com screens por tipo',
      '',
      '2. **Limite de Fragmentação**:',
      '   - Se feature tem <50 arquivos: SEMPRE criar 1 card único',
      '   - Se feature tem >50 arquivos: máximo 2 sub-cards (ex: "Sistema X Backend", "Sistema X Frontend")',
      '   - NUNCA criar 1 card por componente/arquivo (ex: "Componente de Botão", "Hook useAuth")',
      '',
      '3. **Organização das Screens**:',
      '   - Agrupe arquivos relacionados em screens temáticas',
      '   - Exemplos de boas screens:',
      '     - Card "Componentes UI": screens "Buttons & Badges", "Form Inputs", "Dialogs & Modals"',
      '     - Card "Hooks Customizados": screens "Auth Hooks", "Data Hooks", "UI Hooks"',
      '     - Card "Documentação": screens "Getting Started", "API Reference", "Architecture"',
      '',
      '4. **Critério de Qualidade**:',
      '   - ✅ BOM: 10-20 cards no total (features consolidadas)',
      '   - ❌ RUIM: 50+ cards (sobre-fragmentação)',
      '   - ✅ BOM: Cada card com 5-20 screens bem organizadas',
      '   - ❌ RUIM: Muitos cards com 1-2 screens apenas',
      '',
      '5. **Re-consolidação de Backend/Frontend**:',
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
      '      "name": "Overview", ',
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
      '      "name": "Overview", ',
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
      '## Arquivos para Organizar',
      JSON.stringify(filesTrimmed, null, 2),
      '',
      '## Grupos Sugeridos (referência)',
      JSON.stringify(params.proposedGroups, null, 2),
      '',
      '## Instruções',
      '1. Analise os snippets para entender funcionalidades',
      '2. Agrupe por feature de negócio, não por camada',
      '3. screens[].files DEVE conter apenas paths da lista acima',
      '',
      'Retorne o JSON:'
    ].join('\n')

    const body = {
      model,
      temperature: 0.2,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_object' }
    }

    console.log('[AiCardGroupingService] Iniciando chamada LLM', {
      endpoint,
      model,
      filesCount: filesTrimmed.length,
      mode
    })

    try {
      const { content } = await this.callChatCompletions({ endpoint, apiKey, body })
      console.log('[AiCardGroupingService] Resposta LLM recebida', { contentLength: content.length })

      // Normalizar saída do LLM para o schema esperado (fallbacks para Grok)
      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch (parseErr: unknown) {
        throw new Error(`Resposta LLM não é JSON válido: ${String(parseErr instanceof Error ? parseErr.message : parseErr)}`)
      }

      // Normalize the parsed output using shared helper
      const normalized = this.normalizeAiOutput(parsed)
      console.log('[AiCardGroupingService] Cards normalizados:', normalized?.cards?.length || 0)

      return AiOutputSchema.parse(normalized)
    } catch (err: unknown) {
      console.error('[AiCardGroupingService] Erro LLM:', err instanceof Error ? err.message : String(err))
      const msg = String(err instanceof Error ? err.message : err)
      if (msg.includes('response_format') || msg.includes('json_object') || msg.includes('LLM HTTP 400')) {
        const body2 = {
          model,
          temperature: 0.2,
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
        return AiOutputSchema.parse(retryNormalized)
      }
      throw err
    }
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
