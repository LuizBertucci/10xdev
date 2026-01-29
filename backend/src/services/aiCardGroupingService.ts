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
    const text = await res.text().catch((e) => {
      console.error('[AiCardGroupingService] Erro ao ler body da resposta:', e?.message)
      return ''
    })
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
      'Você é um arquiteto de software especializado em organizar código.',
      '',
      '## Tarefa',
      'Organize os arquivos em "cards" por funcionalidade de negócio.',
      '',
      '## Regras Críticas Anti-Fragmentação',
      '- 1 card = 1 feature coesa (ex: Autenticação, Usuários, Pagamentos)',
      '- Agrupe arquivos relacionados mesmo de camadas diferentes',
      '- **IMPORTANTE**: Consolide features similares em UM ÚNICO card:',
      '  - Componentes UI (button, input, dialog, etc) → 1 card "Componentes UI"',
      '  - Skills/utilities do mesmo namespace (n8n/*, utils/*) → 1 card',
      '  - Documentação (readme, guide, etc) → 1 card "Documentação"',
      '- Cada card tem múltiplas "screens" organizadas por camada técnica',
      '- **NÃO crie 1 card por arquivo pequeno** - agrupe em cards maiores e coesos',
      '',
      '## Detecção de Namespace',
      'Se arquivos estão no mesmo diretório/namespace, provavelmente são da mesma feature:',
      '- backend/src/skills/n8n/* → card "Skills n8n"',
      '- frontend/components/ui/* → card "Componentes UI"',
      '- backend/src/auth/* → card "Sistema de Autenticação"',
      '',
      '## Formato de Saída',
      '- title: Nome descritivo em português (ex: "Sistema de Autenticação")',
      '- description: O que a funcionalidade FAZ (não liste arquivos)',
      '- category: Categoria do card (ex: "Autenticação", "Componentes UI", "Utilitários")',
      '- tech: Tecnologia principal (ex: "React", "Node.js")',
      '- screens[].name: Nome da camada (ex: "Backend - Controller", "Frontend - Component")',
      '- screens[].files: Paths EXATOS dos arquivos da lista fornecida',
      '',
      '## Exemplos de Bons Títulos',
      '✅ "Sistema de Autenticação" (não "Auth" ou "Login Controller")',
      '✅ "Componentes UI" (não "Componente de Botão" separado)',
      '✅ "Skills n8n" (não "Skill Code Generator" separado)',
      '✅ "Gerenciamento de Usuários" (não "User")',
      '✅ "Processamento de Pagamentos" (não "Payment")',
      '',
      '## Exemplos do que NÃO fazer (anti-patterns)',
      '❌ Criar "Componente de Botão", "Componente de Input" separados → Consolidar em "Componentes UI"',
      '❌ Criar "Skill Validator", "Skill Generator" separados → Consolidar em "Skills n8n"',
      '❌ Criar 1 card com apenas 1-2 arquivos pequenos → Agrupar com feature relacionada',
      '❌ Títulos genéricos como "Utils", "Helpers" → Ser específico ou consolidar',
      '',
      '## Critério de Qualidade',
      'Bom agrupamento tem:',
      '- 10-30 cards no total (não 100+)',
      '- Cada card com 3-15 screens',
      '- Títulos descritivos e em português',
      '- Features completas (backend + frontend juntos quando possível)',
      '',
      '## Saída',
      'Retorne APENAS JSON válido com a chave "cards".'
    ].join('\n')

    const user = [
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
      '## Estrutura das Screens',
      '',
      'IMPORTANTE: A PRIMEIRA screen de cada card deve ser um OVERVIEW da funcionalidade.',
      '',
      '### Screen 1 - OVERVIEW (obrigatória):',
      '- **Nome**: "Overview" ou "Visão Geral"',
      '- **Descrição**: Resumo executivo em 2-4 parágrafos explicando:',
      '  - O que é essa funcionalidade',
      '  - Qual problema resolve',
      '  - Componentes principais (lista dos arquivos mais importantes)',
      '  - Como funciona (fluxo básico)',
      '- **Arquivos**: Deixar vazio [] ou incluir apenas README/docs principais',
      '',
      '### Screens 2+ - Detalhamento técnico:',
      '- Organize por responsabilidade técnica',
      '- Agrupe arquivos relacionados',
      '- Exemplo: "Backend - Controllers", "Frontend - Components", etc',
      '',
      '### Exemplos de Consolidação CORRETA:',
      '',
      '**Exemplo 1: Feature "ui" com 40 arquivos**',
      '```json',
      '{',
      '  "title": "Componentes UI",',
      '  "description": "Biblioteca completa de componentes reutilizáveis incluindo botões, inputs, dialogs e utilitários de interface.",',
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
      '  "description": "Hooks React reutilizáveis para autenticação, gerenciamento de estado e integração com APIs.",',
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
      totalChars,
      mode
    })

    let llmContent: string | undefined

    try {
      const { content } = await this.callChatCompletions({ endpoint, apiKey, body })
      console.log('[AiCardGroupingService] Resposta LLM recebida', { contentLength: content.length })
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
      console.log('[AiCardGroupingService] Cards normalizados:', normalized?.cards?.length || 0)

      return AiOutputSchema.parse(normalized)
    } catch (err: any) {
      console.error('[AiCardGroupingService] Erro LLM:', err?.message)
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

