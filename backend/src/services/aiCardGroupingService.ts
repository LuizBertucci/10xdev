import { randomUUID } from 'crypto'
import { ContentType } from '@/types/cardfeature'

/**
 * Extrai JSON da resposta da IA, que pode vir em markdown (```json ... ```) ou com texto extra.
 */
function extractJsonFromAiResponse(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Resposta da IA está vazia')

  // 1. Tentar parse direto
  try {
    return JSON.parse(trimmed)
  } catch {
    /* continuar */
  }

  // 2. Extrair de bloco markdown ```json ... ``` ou ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]!.trim())
    } catch {
      /* continuar */
    }
  }

  // 3. Encontrar primeiro { e último } e tentar parse
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
    } catch {
      /* continuar */
    }
  }

  // 4. Falhou — logar e lançar
  const snippet = trimmed.length > 500 ? `${trimmed.slice(0, 250)}...${trimmed.slice(-250)}` : trimmed
  console.error('[AiCardGroupingService] Resposta da IA não é JSON válido. Trecho:', snippet)
  throw new Error(`Resposta da IA não é JSON válido. Primeiros caracteres: ${trimmed.slice(0, 100).replace(/\n/g, ' ')}`)
}
import type { CardFeatureScreen, ContentBlock, CreateCardFeatureRequest } from '@/types/cardfeature'
import type { FileEntry } from './githubService'
import { CardQualitySupervisor } from './cardQualitySupervisor'
import { resolveApiKey, resolveChatCompletionsUrl, callChatCompletions, type LlmUsage } from './llmClient'
import { cleanMarkdown } from '@/utils/markdownUtils'
import { normalizeAiOutput, buildCardsFromAiOutput } from './aiCardBuilder'

export class AiCardGroupingService {
  private static normalizeSingleCodeFilePerScreen(card: CreateCardFeatureRequest): CreateCardFeatureRequest {
    const normalizedScreens: CardFeatureScreen[] = []

    for (const screen of card.screens || []) {
      const codeBlocks = (screen.blocks || []).filter(b => b.type === ContentType.CODE)
      const nonCodeBlocks = (screen.blocks || []).filter(b => b.type !== ContentType.CODE)

      // Mantém screens sem código (ex.: telas textuais) sem alteração estrutural.
      if (codeBlocks.length <= 1) {
        normalizedScreens.push({
          ...screen,
          blocks: (screen.blocks || []).map((block, index) => ({ ...block, order: index }))
        })
        continue
      }

      // Quebra screens com múltiplos arquivos de código em uma screen por arquivo.
      codeBlocks.forEach((codeBlock, index) => {
        const routeOrTitle = codeBlock.route || codeBlock.title || `${screen.name}-${index + 1}`
        const fileName = routeOrTitle.split('/').pop() || routeOrTitle
        const derivedName = index === 0 ? screen.name : fileName
        const baseBlocks: ContentBlock[] = [{ ...codeBlock, order: 0 }]

        // Mantém blocos não-código apenas na primeira aba derivada.
        if (index === 0 && nonCodeBlocks.length > 0) {
          nonCodeBlocks.forEach((block, nonCodeIndex) => {
            baseBlocks.push({ ...block, order: nonCodeIndex + 1 })
          })
        }

        normalizedScreens.push({
          ...screen,
          name: derivedName,
          blocks: baseBlocks
        })
      })
    }

    return {
      ...card,
      screens: normalizedScreens
    }
  }

  static isEnabled(): boolean {
    return process.env.GITHUB_IMPORT_USE_AI === 'true'
  }

  static hasConfig(): boolean {
    return Boolean(resolveApiKey())
  }

  // ================================================
  // AI - GERAR CARDS DO REPOSITÓRIO (REPO INTEIRO)
  // ================================================

  /** Gera cards via IA enviando o repositório INTEIRO sem limits.
   *  Usa Grok 4 Fast com 2M token context window. */
  static async generateCardGroupsFromRepo(
    files: FileEntry[],
    repoUrl: string,
    options?: {
      onProgress?: (update: { step: string; progress?: number; message?: string; tokenUsage?: LlmUsage }) => void
      onCardReady?: (card: CreateCardFeatureRequest) => Promise<void>
      onLog?: (message: string) => void
    }
  ): Promise<{
    cards: CreateCardFeatureRequest[]
    filesProcessed: number
    aiCardsCreated: number
    quality: { issuesFound: number; mergesApplied: number; cardsRemoved: number }
    tokenUsage?: LlmUsage
  }> {
    const notify = (step: string, progress: number, message: string, tokenUsage?: LlmUsage) =>
      options?.onProgress?.({ step, progress, message, ...(tokenUsage && { tokenUsage }) })

    const emitCard = async (card: CreateCardFeatureRequest) => {
      if (options?.onCardReady) {
        try { await options.onCardReady(card) }
        catch (err) {
          console.error(`Erro ao criar card "${card.title}":`, err)
          throw err
        }
      }
    }

    const apiKey = resolveApiKey()
    if (!apiKey) {
      throw new Error('API key não configurada. A importação depende de IA por padrão.')
    }

    const model = process.env.OPENAI_MODEL || 'grok-4-1-fast'
    const endpoint = resolveChatCompletionsUrl()

    notify('ai_preparing', 10, 'Preparando dados para IA...')
    options?.onLog?.('Preparando dados para IA...')

    const filteredFiles = files
    if (filteredFiles.length === 0) {
      throw new Error('Nenhum arquivo elegível para processamento por IA.')
    }

    const PREVIEW_LINES = 10
    const fileList = filteredFiles.map(f => ({
      path: f.path,
      size: f.size,
      preview: f.content ? f.content.split('\n').slice(0, PREVIEW_LINES).join('\n') : ''
    }))

    const groupingSystemPrompt = [
      'Você é um arquiteto de software especializado em documentar repositórios como cards de features.',
      '',
      '## Tarefa',
      'Analise o repositório e organize os arquivos em cards. Cada card representa uma feature completa de ponta a ponta.',
      'Você receberá um JSON com repoUrl, totalFiles e files (path, size, preview com as primeiras 10 linhas — imports e declarações iniciais).',
      '',
      '## O que é um card',
      'Um card = um fluxo completo do usuário. Inclua todos os arquivos que fazem essa feature funcionar:',
      'frontend, backend, middleware, modelos — se servem ao mesmo fluxo, ficam no mesmo card.',
      '',
      '## Exemplos',
      '- "Sistema de Autenticação": login page + auth controller + JWT middleware + auth service → 1 card',
      '- Dentro da categoria "Projetos": "Importação GitHub" e "Geração de Cards via IA" são fluxos distintos → 2 cards separados',
      '',
      '## Regras',
      '- Separe em cards distintos quando os fluxos têm propósitos diferentes para o usuário',
      '- Agrupe no mesmo card quando os arquivos servem ao mesmo fluxo de ponta a ponta',
      '- Repositórios com 50+ arquivos tipicamente geram 15-40 cards',
      '- Category = domínio amplo (ex: "Autenticação", "Projetos", "Componentes UI")',
      '- Vários cards DEVEM compartilhar a mesma category',
      '',
      '## Formato de Saída (JSON)',
      'Retorne APENAS JSON válido:',
      '{',
      '  "cards": [',
      '    {',
      '      "title": "Nome da Feature",',
      '      "category": "Categoria",',
      '      "description": "O que essa feature faz para o usuário",',
      '      "tech": "Tecnologia principal",',
      '      "tags": ["tag1", "tag2"],',
      '      "screens": [',
      '        { "name": "Screen Name", "description": "...", "files": ["path1", "path2"] }',
      '      ]',
      '    }',
      '  ]',
      '}'
    ].join('\n')

    const repoPathCodeContext = JSON.stringify({
      repoUrl,
      totalFiles: filteredFiles.length,
      files: fileList
    }, null, 2)

    notify('ai_analyzing', 30, '🤖 IA analisando repositório completo...')
    options?.onLog?.('🤖 IA analisando repositório completo...')

    // Grok 4.1 Fast tem limite de 8.192 tokens de saída via API (independente do contexto de 2M).
    const maxTokens = process.env.LLM_MAX_TOKENS ? Number(process.env.LLM_MAX_TOKENS) : 8_192
    const body: Record<string, unknown> = {
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: groupingSystemPrompt },
        { role: 'user', content: repoPathCodeContext }
      ],
      max_tokens: maxTokens
    }

    const runPipeline = async (responseContent: string) => {
      const parsed = extractJsonFromAiResponse(responseContent)
      const normalized = normalizeAiOutput(parsed)
      const aiCards = normalized.cards || []
      const builtCards = buildCardsFromAiOutput(aiCards, filteredFiles)
      if (builtCards.length === 0) {
        throw new Error('IA não retornou cards válidos para o repositório.')
      }
      const onLog = (msg: string) => {
        console.log(`[AiCardGroupingService] ${msg}`)
        options?.onLog?.(msg)
      }
      const qualityReport = CardQualitySupervisor.analyzeQuality(builtCards, { onLog })
      // Supervisor desabilitado temporariamente — avaliar impacto do novo prompt
      const corrections = { correctedCards: builtCards, mergesApplied: 0, cardsRemoved: 0 }
      return { qualityReport, corrections }
    }

    try {
      const { content, usage, finish_reason } = await callChatCompletions({ endpoint, apiKey, body })

      const finishMsg = `finish_reason: ${finish_reason ?? 'undefined'}`
      console.log(`[AiCardGroupingService] ${finishMsg}`)
      options?.onLog?.(finishMsg)

      if (finish_reason === 'length') {
        throw new Error(
          `Resposta da IA truncada (limite de ${maxTokens} tokens de saída atingido). ` +
          `Defina LLM_MAX_TOKENS com valor maior ou reduza o repositório.`
        )
      }

      notify('ai_processing', 70, 'Processando resposta da IA...', usage)
      if (usage) {
        const tokenMsg = `Tokens: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`
        console.log(`[AiCardGroupingService] ${tokenMsg}`)
        options?.onLog?.(tokenMsg)
      }

      const { qualityReport, corrections } = await runPipeline(content)
      notify('ai_building', 90, `🤖 ${corrections.correctedCards.length} cards gerados pela IA`)
      options?.onLog?.(`🤖 ${corrections.correctedCards.length} cards gerados pela IA`)

      notify('quality_corrections', 95, 'Aplicando correções de qualidade...')
      options?.onLog?.('Aplicando correções de qualidade...')
      const finalCards = corrections.correctedCards
        .map(card => this.normalizeSingleCodeFilePerScreen(card))
        .map(card => this.addVisaoGeralScreen(card))
      for (const card of finalCards) {
        await emitCard(card)
      }

      const filesProcessed = finalCards.reduce(
        (sum, c) => sum + c.screens.reduce((s, sc) => s + sc.blocks.filter(b => b.type === ContentType.CODE).length, 0),
        0
      )
      return {
        cards: finalCards,
        filesProcessed,
        aiCardsCreated: finalCards.length,
        quality: {
          issuesFound: qualityReport.issuesFound,
          mergesApplied: corrections.mergesApplied,
          cardsRemoved: corrections.cardsRemoved
        },
        ...(usage && { tokenUsage: usage })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('response_format') || msg.includes('json_object') || msg.includes('LLM HTTP 400')) {
        const body2: Record<string, unknown> = {
          model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: `${groupingSystemPrompt}\n\nRetorne APENAS JSON válido.` },
            { role: 'system', content: repoPathCodeContext }
          ]
        }
        if (typeof maxTokens === 'number' && maxTokens > 0) body2.max_tokens = maxTokens
        const { content, usage: usageRetry } = await callChatCompletions({ endpoint, apiKey, body: body2 })
        const { qualityReport, corrections } = await runPipeline(content)
        const finalCards = corrections.correctedCards
          .map(card => this.normalizeSingleCodeFilePerScreen(card))
          .map(card => this.addVisaoGeralScreen(card))

        for (const card of finalCards) {
          await emitCard(card)
        }

        const filesProcessedRetry = finalCards.reduce(
          (sum, c) => sum + c.screens.reduce((s, sc) => s + sc.blocks.filter(b => b.type === ContentType.CODE).length, 0),
          0
        )
        if (usageRetry) {
          const tokenMsg = `Tokens (retry): ${usageRetry.prompt_tokens} prompt + ${usageRetry.completion_tokens} completion = ${usageRetry.total_tokens} total`
          console.log(`[AiCardGroupingService] ${tokenMsg}`)
          options?.onLog?.(tokenMsg)
        }
        return {
          cards: finalCards,
          filesProcessed: filesProcessedRetry,
          aiCardsCreated: finalCards.length,
          quality: {
            issuesFound: qualityReport.issuesFound,
            mergesApplied: corrections.mergesApplied,
            cardsRemoved: corrections.cardsRemoved
          },
          ...(usageRetry && { tokenUsage: usageRetry })
        }
      }
      throw err
    }
  }

  // ================================================
  // AI - GERAR RESUMO DO CARD
  // ================================================

  static async generateCardSummary(params: {
    cardTitle: string
    screens: Array<{ name: string; description: string; blocks: Array<{ type: ContentType; content: string; language?: string; title?: string; route?: string }> }>
    tech?: string
    language?: string
  }, customPrompt?: string): Promise<{ summary: string }> {
    console.log('[generateCardSummary] Iniciando...')
    const apiKey = resolveApiKey()
    console.log('[generateCardSummary] API Key presente:', Boolean(apiKey))

    if (!apiKey) {
      console.error('[generateCardSummary] ERRO: API key não configurada')
      throw new Error('API key não configurada')
    }

    const model = process.env.OPENAI_MODEL || 'grok-4-1-fast-reasoning'
    const endpoint = resolveChatCompletionsUrl()
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

    const summarySystemPrompt = [
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
    const summaryUserPrompt = [
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
    const { content } = await callChatCompletions({
      endpoint,
      apiKey,
      body: {
        model,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: 'system', content: summarySystemPrompt },
          { role: 'user', content: summaryUserPrompt }
        ]
      }
    })

    console.log('[generateCardSummary] Resposta recebida da IA, processando...')
    const summary = content
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    let finalSummary = summary

    if (!summary.match(new RegExp(`^${params.cardTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))) {
      finalSummary = `${params.cardTitle}\n\n${summary}`
    }

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
  // VISÃO GERAL
  // ================================================

  static addVisaoGeralScreen(card: CreateCardFeatureRequest): CreateCardFeatureRequest {
    const content = this.buildVisaoGeralContent(card)
    const summaryBlock: ContentBlock = {
      id: randomUUID(),
      type: ContentType.TEXT,
      content,
      order: 0
    }

    const nonSummaryScreens = card.screens.filter(
      s => !/^(visão geral|visao geral|resumo|sumário|summary|overview)$/i.test(s.name.trim())
    )

    const summaryScreen: CardFeatureScreen = {
      name: 'Visão Geral',
      description: card.description,
      route: '',
      blocks: [summaryBlock]
    }
    return {
      ...card,
      screens: [summaryScreen, ...nonSummaryScreens]
    }
  }

  private static buildVisaoGeralContent(card: CreateCardFeatureRequest): string {
    const nonSummaryScreens = card.screens.filter(
      s => !/^(visão geral|visao geral|resumo|sumário|summary|overview)$/i.test(s.name.trim())
    )

    const codeFiles = nonSummaryScreens
      .flatMap(s => s.blocks)
      .filter(b => b.type === ContentType.CODE)
      .map(b => b.route || b.title || '')
      .filter(Boolean)

    const uniqueFiles = Array.from(new Set(codeFiles))
    const backendFiles = uniqueFiles.filter(file => file.startsWith('backend/'))
    const frontendFiles = uniqueFiles.filter(file => file.startsWith('frontend/'))
    const otherFiles = uniqueFiles.filter(
      file => !file.startsWith('backend/') && !file.startsWith('frontend/')
    )

    const features = nonSummaryScreens
      .map(s => cleanMarkdown(s.description || s.name))
      .filter(Boolean)
      .slice(0, 8)

    const category = cleanMarkdown(card.category || 'Geral')
    const tech = cleanMarkdown(card.tech || 'Não informado')
    const description = cleanMarkdown(card.description || 'Feature mapeada a partir do repositório.')

    return [
      cleanMarkdown(card.title),
      '',
      description,
      '',
      `- *Categoria:* ${category}`,
      `- *Tecnologias:* ${tech}`,
      '',
      'Features',
      ...(features.length > 0
        ? features.map(feature => `- ${feature.endsWith('.') ? feature : `${feature}.`}`)
        : ['- Funcionalidade principal identificada a partir dos arquivos relacionados.']),
      '',
      `### Arquivos (${uniqueFiles.length})`,
      ...(backendFiles.length > 0
        ? ['#### Backend', ...backendFiles.map(file => `- \`${file}\``), '']
        : []),
      ...(frontendFiles.length > 0
        ? ['#### Frontend', ...frontendFiles.map(file => `- \`${file}\``), '']
        : []),
      ...(otherFiles.length > 0
        ? ['#### Outros', ...otherFiles.map(file => `- \`${file}\``)]
        : []),
      ...(!backendFiles.length && !frontendFiles.length && !otherFiles.length
        ? ['- Nenhum arquivo mapeado para este card.']
        : [])
    ].join('\n').trim()
  }
}
