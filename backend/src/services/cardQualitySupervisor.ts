import type { CreateCardFeatureRequest } from '@/types/cardfeature'
import { normalizeTags } from '@/utils/tagNormalization'

export enum QualityIssueType {
  DUPLICATE_TITLE = 'duplicate_title',
  DUPLICATE_CONTENT = 'duplicate_content',
  WEAK_CONTENT = 'weak_content',
  SINGLE_FILE_CARD = 'single_file_card',
  MISSING_DESCRIPTION = 'missing_description',
  TOO_MANY_SCREENS = 'too_many_screens',
  SIMILAR_TECH_LANGUAGE = 'similar_tech_language',
  SAME_FEATURE_SPLIT = 'same_feature_split'
}

export interface QualityIssue {
  type: QualityIssueType
  severity: 'low' | 'medium' | 'high'
  cardIndex: number
  relatedCardIndex?: number
  message: string
  suggestion?: string
}

export interface QualityReport {
  totalCards: number
  issuesFound: number
  issues: QualityIssue[]
  cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }>
  cardsToRemove: number[]
  cardsToImprove: Array<{ index: number; suggestions: string[] }>
}

// Mapeamento de features (mesmo que githubService.ts)
const FEATURE_SEMANTIC_MAP: Record<string, string[]> = {
  'auth': ['auth', 'autenticação', 'autenticacao'],
  'user': ['user', 'usuário', 'usuario', 'usuários', 'usuarios'],
  'payment': ['payment', 'pagamento', 'pagamentos'],
  'database': ['database', 'banco', 'dados'],
  'n8n': ['n8n', 'workflow', 'workflows'],
  'ai': ['ai', 'inteligência', 'artificial', 'inteligencia'],
  'notification': ['notification', 'notificação', 'notificacao', 'notificações', 'notificacoes'],
  'card': ['card', 'cards'],
  'project': ['project', 'projeto', 'projetos'],
  'template': ['template', 'templates'],
  'content': ['content', 'conteúdo', 'conteudo'],
  'admin': ['admin', 'administração', 'administracao'],
  'api': ['api', 'cliente'],
  'storage': ['storage', 'armazenamento']
}

const FEATURE_TITLES: Record<string, string> = {
  'auth': 'Autenticação',
  'user': 'Usuários',
  'payment': 'Pagamentos',
  'database': 'Banco de Dados',
  'n8n': 'Workflows n8n',
  'ai': 'Inteligência Artificial',
  'notification': 'Notificações',
  'card': 'Cards',
  'project': 'Projetos',
  'template': 'Templates',
  'content': 'Conteúdo',
  'admin': 'Administração',
  'api': 'Cliente de API',
  'storage': 'Armazenamento'
}

type QualityLogHandler = (message: string) => void

export class CardQualitySupervisor {
  private static readonly MIN_DESCRIPTION_LENGTH = 10
  private static readonly MIN_FILES_PER_CARD = 2
  private static readonly MAX_SCREENS_PER_CARD = 20
  private static readonly SIMILARITY_THRESHOLD = 0.85

  private static emit(message: string, onLog?: QualityLogHandler): void {
    console.log(message)
    onLog?.(message)
  }

  static analyzeQuality(
    cards: CreateCardFeatureRequest[],
    options?: { onLog?: QualityLogHandler }
  ): QualityReport {
    const onLog = options?.onLog
    this.emit(`[CardQualitySupervisor] Iniciando análise de qualidade de ${cards.length} cards`, onLog)

    const issues: QualityIssue[] = []
    const cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }> = []
    const cardsToRemove: number[] = []
    const cardsToImprove: Array<{ index: number; suggestions: string[] }> = []

    // Check PRIORITÁRIO: consolidar subcategorias fragmentadas
    this.checkSubcategoryFragmentation(cards, issues, cardsToMerge, onLog)

    // Check crítico: detectar mesma feature dividida em cards separados
    this.checkSameFeatureSplit(cards, issues, cardsToMerge, onLog)

    // Check 1: Detectar títulos duplicados
    this.checkDuplicateTitles(cards, issues, cardsToMerge, onLog)

    // Check 2: Detectar conteúdo duplicado ou muito similar
    this.checkDuplicateContent(cards, issues, cardsToMerge, onLog)

    // Check 3: Detectar conteúdo fraco (poucos arquivos, sem descrição, etc)
    this.checkWeakContent(cards, issues, cardsToImprove)

    // Consolidar cards para remoção (duplicados completos)
    this.consolidateRemovalList(issues, cardsToRemove)

    const report: QualityReport = {
      totalCards: cards.length,
      issuesFound: issues.length,
      issues,
      cardsToMerge,
      cardsToRemove,
      cardsToImprove
    }

    this.logReport(report, onLog)
    return report
  }

  /**
   * Detecta cards que são SUBCATEGORIAS e devem ser consolidados
   * Ex: "Componente de Botão UI", "Componente Colapsível UI" → "Componentes UI"
   */
  private static checkSubcategoryFragmentation(
    cards: CreateCardFeatureRequest[],
    issues: QualityIssue[],
    cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }>,
    onLog?: QualityLogHandler
  ): void {
    // Padrões para detectar fragmentação
    const patterns = [
      {
        regex: /^Componente (de |d[oa] )?.+UI$/i,
        category: 'ui',
        targetTitle: 'Componentes UI'
      },
      {
        regex: /^Skill .+$/i,
        category: 'skill',
        targetTitle: 'Skills n8n'
      },
      {
        regex: /^(Documentação|Guia|Tutorial|README).+$/i,
        category: 'docs',
        targetTitle: 'Documentação'
      },
      {
        regex: /^(Util|Helper|Lib).+$/i,
        category: 'utils',
        targetTitle: 'Utilitários'
      },
      {
        regex: /^Hook .+$/i,
        category: 'hook',
        targetTitle: 'Hooks Customizados'
      },
      {
        regex: /^Hook use[A-Z].+$/i,
        category: 'hook',
        targetTitle: 'Hooks Customizados'
      },
      {
        regex: /^(Cliente|API|Serviço).+ (de|da) .+$/i,
        category: 'api',
        targetTitle: 'Cliente de API'
      },
      {
        regex: /^Utilitário.+ (de|da|do) .+$/i,
        category: 'utils',
        targetTitle: 'Utilitários'
      },
      {
        regex: /^Configuração.+ (de|da|do) .+$/i,
        category: 'config',
        targetTitle: 'Configurações'
      },
      {
        regex: /^(Teste|Test).+ (de|da|do) .+$/i,
        category: 'test',
        targetTitle: 'Testes'
      },
      {
        regex: /^(Style|Estilo).+ (de|da|do) .+$/i,
        category: 'style',
        targetTitle: 'Estilos'
      },
      {
        regex: /^Template.+ (de|da|do) .+$/i,
        category: 'template',
        targetTitle: 'Templates'
      },
      {
        regex: /^Middleware.+ (de|da|do) .+$/i,
        category: 'middleware',
        targetTitle: 'Middlewares'
      },
      {
        regex: /^(Modelo|Model).+ (de|da|do) .+$/i,
        category: 'model',
        targetTitle: 'Modelos de Dados'
      },
      {
        regex: /^(Serviço de Integração|Integração).+ (com|ao|à) .+$/i,
        category: 'integration',
        targetTitle: 'Integrações'
      }
    ]

    for (const pattern of patterns) {
      const matches: number[] = []

      // Encontrar todos os cards que batem com o padrão
      for (let i = 0; i < cards.length; i++) {
        if (pattern.regex.test(cards[i]!.title)) {
          matches.push(i)
        }
      }

      // Se tem 2+ cards do mesmo padrão, consolidar todos
      if (matches.length > 1) {
        this.emit(`[Supervisor] Subcategoria ${pattern.category}: ${matches.length} cards fragmentados`, onLog)

        const targetIndex = matches[0]!

        // Atualizar título do card target
        cards[targetIndex]!.title = pattern.targetTitle

        // Marcar os outros para merge
        for (let i = 1; i < matches.length; i++) {
          issues.push({
            type: QualityIssueType.SAME_FEATURE_SPLIT,
            severity: 'high',
            cardIndex: matches[i]!,
            relatedCardIndex: targetIndex,
            message: `Card "${cards[matches[i]!]!.title}" é subcategoria de "${pattern.targetTitle}"`,
            suggestion: `Consolidar em card único "${pattern.targetTitle}"`
          })

          cardsToMerge.push({
            sourceIndex: matches[i]!,
            targetIndex,
            reason: `Subcategoria de ${pattern.targetTitle}`
          })
        }
      }
    }
  }

  /**
   * Check crítico: detectar cards da MESMA feature que foram separados
   * Ex: "API de Auth" + "Interface de Auth" devem virar "Sistema de Auth"
   */
  private static checkSameFeatureSplit(
    cards: CreateCardFeatureRequest[],
    issues: QualityIssue[],
    cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }>,
    onLog?: QualityLogHandler
  ): void {
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        // Usa nova função que analisa título E conteúdo
        const featureI = this.extractFeatureFromTitleAndContent(cards[i]!)
        const featureJ = this.extractFeatureFromTitleAndContent(cards[j]!)

        if (featureI && featureI === featureJ) {
          this.emit(`[Supervisor] Mesma feature detectada: "${cards[i]!.title}" + "${cards[j]!.title}"`, onLog)

          issues.push({
            type: QualityIssueType.SAME_FEATURE_SPLIT,
            severity: 'high',
            cardIndex: j,
            relatedCardIndex: i,
            message: `Cards "${cards[i]!.title}" e "${cards[j]!.title}" são da mesma feature "${featureI}"`,
            suggestion: `Fazer merge em "Sistema de ${FEATURE_TITLES[featureI] || featureI}"`
          })

          cardsToMerge.push({
            sourceIndex: j,
            targetIndex: i,
            reason: `Mesma feature: ${featureI}`
          })
        }
      }
    }
  }

  /**
   * Extrai feature do título do card
   * "Sistema de Autenticação" → "auth"
   * "API de Usuários" → "user"
   * "Interface de Pagamentos" → "payment"
   */
  private static extractFeatureFromTitle(title: string): string | null {
    const match = title.match(/(?:Sistema|API|Interface)\s+de\s+(.+)/i)
    if (match) {
      const featureName = match[1]!.toLowerCase()

      // Mapear para feature semântica
      for (const [feature, keywords] of Object.entries(FEATURE_SEMANTIC_MAP)) {
        for (const keyword of keywords) {
          if (featureName.includes(keyword)) {
            return feature
          }
        }
      }
    }
    return null
  }

  /**
   * Extrai feature do título E do conteúdo do card (screens)
   * Versão mais robusta que não depende apenas de pattern matching
   */
  private static extractFeatureFromTitleAndContent(card: CreateCardFeatureRequest): string | null {
    const title = card.title.toLowerCase()

    // 1. Padrão tradicional (mantém retrocompatibilidade)
    const match = card.title.match(/(?:Sistema|API|Interface)\s+de\s+(.+)/i)
    if (match) {
      const featureName = match[1]!.toLowerCase()
      for (const [feature, keywords] of Object.entries(FEATURE_SEMANTIC_MAP)) {
        for (const keyword of keywords) {
          if (featureName.includes(keyword)) return feature
        }
      }
    }

    // 2. Detecção por keywords no título
    for (const [feature, keywords] of Object.entries(FEATURE_SEMANTIC_MAP)) {
      for (const keyword of keywords) {
        if (title.includes(keyword)) return feature
      }
    }

    // 3. Análise dos nomes das screens (layers)
    const screenNames = card.screens?.map(s => s.name.toLowerCase()) || []

    // Se muitas screens têm "Backend -" no nome, analisa camada
    const layers = screenNames.map(name => {
      const layerMatch = name.match(/(?:Backend|Frontend)\s+-\s+(\w+)/)
      return layerMatch ? layerMatch[1]! : null
    }).filter(Boolean)

    // Se tem Controller/Service de auth → feature "auth"
    if (layers.includes('Controller') || layers.includes('Service')) {
      if (title.includes('auth') || screenNames.some(n => n.includes('auth'))) {
        return 'auth'
      }
    }

    // Se tem Component de UI → feature "ui"
    if (layers.includes('Component')) {
      const uiKeywords = ['button', 'badge', 'dialog', 'input', 'select', 'component']
      if (uiKeywords.some(kw => title.includes(kw))) {
        return 'ui'
      }
    }

    return null
  }

  private static checkDuplicateTitles(
    cards: CreateCardFeatureRequest[],
    issues: QualityIssue[],
    cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }>,
    onLog?: QualityLogHandler
  ): void {
    const titleMap = new Map<string, number[]>()

    cards.forEach((card, index) => {
      const normalizedTitle = this.normalizeString(card.title)
      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, [])
      }
      titleMap.get(normalizedTitle)!.push(index)
    })

    for (const [title, indices] of titleMap) {
      if (indices.length > 1) {
        this.emit(`[CardQualitySupervisor] Título duplicado encontrado: "${title}" (${indices.length} cards)`, onLog)

        for (let i = 1; i < indices.length; i++) {
          issues.push({
            type: QualityIssueType.DUPLICATE_TITLE,
            severity: 'high',
            cardIndex: indices[i]!,
            relatedCardIndex: indices[0]!,
            message: `Card "${cards[indices[i]!]!.title}" tem título duplicado com card #${indices[0]!}`,
            suggestion: 'Considerar merge dos cards'
          })

          cardsToMerge.push({
            sourceIndex: indices[i]!,
            targetIndex: indices[0]!,
            reason: `Títulos idênticos: "${cards[indices[0]!]!.title}"`
          })
        }
      }
    }
  }

  private static checkDuplicateContent(
    cards: CreateCardFeatureRequest[],
    issues: QualityIssue[],
    cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }>,
    onLog?: QualityLogHandler
  ): void {
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const similarity = this.calculateContentSimilarity(cards[i]!, cards[j]!)

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          this.emit(`[CardQualitySupervisor] Conteúdo similar encontrado entre cards #${i} e #${j} (similaridade: ${(similarity * 100).toFixed(0)}%)`, onLog)

          issues.push({
            type: QualityIssueType.DUPLICATE_CONTENT,
            severity: similarity >= 0.95 ? 'high' : 'medium',
            cardIndex: j,
            relatedCardIndex: i,
            message: `Card "${cards[j]!.title}" tem conteúdo ${(similarity * 100).toFixed(0)}% similar ao card #${i} "${cards[i]!.title}"`,
            suggestion: 'Considerar merge ou remoção do duplicado'
          })

          if (similarity >= 0.95) {
            cardsToMerge.push({
              sourceIndex: j,
              targetIndex: i,
              reason: `Conteúdo ${(similarity * 100).toFixed(0)}% similar`
            })
          }
        }
      }
    }
  }

  private static checkWeakContent(
    cards: CreateCardFeatureRequest[],
    issues: QualityIssue[],
    cardsToImprove: Array<{ index: number; suggestions: string[] }>
  ): void {
    cards.forEach((card, index) => {
      const suggestions: string[] = []

      if (!card.description || card.description.length < this.MIN_DESCRIPTION_LENGTH) {
        issues.push({
          type: QualityIssueType.MISSING_DESCRIPTION,
          severity: 'low',
          cardIndex: index,
          message: `Card "${card.title}" tem descrição ausente ou muito curta`,
          suggestion: 'Adicionar descrição mais detalhada do que a funcionalidade faz'
        })
        suggestions.push('Adicionar descrição mais detalhada')
      }

      const totalFiles = this.countTotalFiles(card)
      if (totalFiles < this.MIN_FILES_PER_CARD) {
        issues.push({
          type: QualityIssueType.SINGLE_FILE_CARD,
          severity: 'medium',
          cardIndex: index,
          message: `Card "${card.title}" tem apenas ${totalFiles} arquivo(s)`,
          suggestion: 'Considerar agrupar com outros cards relacionados ou adicionar mais contexto'
        })
        suggestions.push('Agrupar com cards relacionados ou adicionar mais arquivos')
      }

      if (suggestions.length > 0) {
        cardsToImprove.push({ index, suggestions })
      }
    })
  }

  private static consolidateRemovalList(issues: QualityIssue[], cardsToRemove: number[]): void {
    const duplicatesByCard = new Map<number, QualityIssue[]>()

    issues.forEach(issue => {
      if (issue.type === QualityIssueType.DUPLICATE_TITLE ||
          (issue.type === QualityIssueType.DUPLICATE_CONTENT && issue.severity === 'high')) {
        if (!duplicatesByCard.has(issue.cardIndex)) {
          duplicatesByCard.set(issue.cardIndex, [])
        }
        duplicatesByCard.get(issue.cardIndex)!.push(issue)
      }
    })

    for (const [cardIndex, cardIssues] of duplicatesByCard) {
      const hasTitleDupe = cardIssues.some(i => i.type === QualityIssueType.DUPLICATE_TITLE)
      const hasContentDupe = cardIssues.some(i => i.type === QualityIssueType.DUPLICATE_CONTENT && i.severity === 'high')

      if (hasTitleDupe && hasContentDupe) {
        cardsToRemove.push(cardIndex)
      }
    }
  }

  private static calculateContentSimilarity(cardA: CreateCardFeatureRequest, cardB: CreateCardFeatureRequest): number {
    const filesA = this.extractFilePaths(cardA)
    const filesB = this.extractFilePaths(cardB)

    if (filesA.size === 0 || filesB.size === 0) return 0

    const intersection = new Set([...filesA].filter(x => filesB.has(x)))
    const union = new Set([...filesA, ...filesB])

    return intersection.size / union.size
  }

  private static extractFilePaths(card: CreateCardFeatureRequest): Set<string> {
    const paths = new Set<string>()

    card.screens?.forEach(screen => {
      screen.blocks?.forEach(block => {
        if (block.route) {
          paths.add(this.normalizeString(block.route))
        }
        if (block.title) {
          paths.add(this.normalizeString(block.title))
        }
      })
    })

    return paths
  }

  private static countTotalFiles(card: CreateCardFeatureRequest): number {
    let count = 0
    card.screens?.forEach(screen => {
      count += screen.blocks?.length || 0
    })
    return count
  }

  private static normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  static applyCorrections(
    cards: CreateCardFeatureRequest[],
    report: QualityReport,
    options?: { onLog?: QualityLogHandler }
  ): { correctedCards: CreateCardFeatureRequest[]; mergesApplied: number; cardsRemoved: number } {
    const onLog = options?.onLog
    this.emit('[CardQualitySupervisor] Aplicando correções automáticas', onLog)
    this.emit(`Cards originais: ${cards.length}`, onLog)
    this.emit(`Merges a aplicar: ${report.cardsToMerge.length}`, onLog)
    this.emit(`Cards a remover: ${report.cardsToRemove.length}`, onLog)

    let mergesApplied = 0
    let cardsRemoved = 0

    const { mergedCards, mergeCount } = this.applyMerges(cards, report.cardsToMerge, onLog)
    mergesApplied = mergeCount
    let workingCards = mergedCards

    const { filteredCards, removeCount } = this.removeCards(workingCards, report.cardsToRemove)
    cardsRemoved = removeCount
    workingCards = filteredCards

    // Normalizar tags de todos os cards (safety-net final)
    for (const card of workingCards) {
      if (card.tags) {
        card.tags = normalizeTags(card.tags)
      }
    }

    this.emit(`[CardQualitySupervisor] Resultado: ${workingCards.length} cards (${mergesApplied} merges, ${cardsRemoved} removidos)`, onLog)

    return {
      correctedCards: workingCards,
      mergesApplied,
      cardsRemoved
    }
  }

  private static applyMerges(
    cards: CreateCardFeatureRequest[],
    merges: Array<{ sourceIndex: number; targetIndex: number; reason: string }>,
    onLog?: QualityLogHandler
  ): { mergedCards: CreateCardFeatureRequest[]; mergeCount: number } {
    if (merges.length === 0) {
      return { mergedCards: [...cards], mergeCount: 0 }
    }

    this.emit(`[CardQualitySupervisor] Aplicando ${merges.length} merge(s)...`, onLog)

    const workingCards = [...cards]
    const toRemove = new Set<number>()

    const mergesByTarget = new Map<number, number[]>()
    for (const merge of merges) {
      if (!mergesByTarget.has(merge.targetIndex)) {
        mergesByTarget.set(merge.targetIndex, [])
      }
      mergesByTarget.get(merge.targetIndex)!.push(merge.sourceIndex)
    }

    let mergeCount = 0

    for (const [targetIndex, sourceIndices] of mergesByTarget) {
      const targetCard = workingCards[targetIndex]
      if (!targetCard) continue

      this.emit(`[CardQualitySupervisor] Processando merge no target card #${targetIndex} "${targetCard.title}"`, onLog)

      for (const sourceIndex of sourceIndices) {
        const sourceCard = workingCards[sourceIndex]
        if (!sourceCard || toRemove.has(sourceIndex)) continue

        this.emit(`[CardQualitySupervisor] Merge: "${sourceCard.title}" (#${sourceIndex}) -> "${targetCard.title}" (#${targetIndex})`, onLog)

        // Mesclar screens do source no target
        for (const sourceScreen of sourceCard.screens || []) {
          const existingScreenIndex = targetCard.screens?.findIndex(s => s.name === sourceScreen.name)

          if (existingScreenIndex !== undefined && existingScreenIndex >= 0 && targetCard.screens) {
            const existingScreen = targetCard.screens[existingScreenIndex]!
            const existingRoutes = new Set(existingScreen.blocks?.map(b => b.route) || [])

            for (const block of sourceScreen.blocks || []) {
              if (!existingRoutes.has(block.route)) {
                existingScreen.blocks = existingScreen.blocks || []
                existingScreen.blocks.push({
                  ...block,
                  order: existingScreen.blocks.length
                })
              }
            }
          } else {
            if (!targetCard.screens) targetCard.screens = []
            targetCard.screens.push(sourceScreen)
          }
        }

        // Melhorar descrição se a do source for mais detalhada
        if (sourceCard.description && sourceCard.description.length > (targetCard.description?.length || 0)) {
          targetCard.description = sourceCard.description
        }

        // Atualizar título para "Sistema de X" se for merge de mesma feature
        const feature = this.extractFeatureFromTitle(targetCard.title)
        if (feature) {
          const title = FEATURE_TITLES[feature] || feature
          targetCard.title = `Sistema de ${title}`
        }

        toRemove.add(sourceIndex)
        mergeCount++
      }
    }

    const result = workingCards.filter((_, index) => !toRemove.has(index))

    this.emit(`[CardQualitySupervisor] ${mergeCount} merge(s) aplicado(s), ${toRemove.size} card(s) removido(s)`, onLog)

    return { mergedCards: result, mergeCount }
  }

  private static removeCards(
    cards: CreateCardFeatureRequest[],
    indicesToRemove: number[]
  ): { filteredCards: CreateCardFeatureRequest[]; removeCount: number } {
    if (indicesToRemove.length === 0) {
      return { filteredCards: [...cards], removeCount: 0 }
    }

    this.emit(`[CardQualitySupervisor] Removendo ${indicesToRemove.length} card(s) de baixa qualidade`)

    const toRemove = new Set(indicesToRemove)
    const result = cards.filter((card, index) => {
      if (toRemove.has(index)) {
        this.emit(`[CardQualitySupervisor] Removido: "${card.title}" (#${index})`)
        return false
      }
      return true
    })

    return { filteredCards: result, removeCount: indicesToRemove.length }
  }

  private static logReport(report: QualityReport, onLog?: QualityLogHandler): void {
    this.emit('[CardQualitySupervisor] === RELATÓRIO DE QUALIDADE ===', onLog)
    this.emit(`Total de cards analisados: ${report.totalCards}`, onLog)
    this.emit(`Issues encontrados: ${report.issuesFound}`, onLog)
    this.emit(`Cards sugeridos para merge: ${report.cardsToMerge.length}`, onLog)
    this.emit(`Cards sugeridos para remoção: ${report.cardsToRemove.length}`, onLog)

    if (report.cardsToMerge.length > 0) {
      this.emit('--- Sugestões de Merge ---', onLog)
      report.cardsToMerge.slice(0, 5).forEach((merge, index) => {
        this.emit(`  ${index + 1}. Card #${merge.sourceIndex} -> Card #${merge.targetIndex} (${merge.reason})`, onLog)
      })
      if (report.cardsToMerge.length > 5) {
        this.emit(`  ... e mais ${report.cardsToMerge.length - 5} sugestões`, onLog)
      }
    }

    this.emit('='.repeat(50), onLog)
  }
}
