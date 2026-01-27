import type { CreateCardFeatureRequest, CardFeatureScreen } from '@/types/cardfeature'

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

export class CardQualitySupervisor {
  private static readonly MIN_DESCRIPTION_LENGTH = 10
  private static readonly MIN_FILES_PER_CARD = 2
  private static readonly MAX_SCREENS_PER_CARD = 20
  private static readonly SIMILARITY_THRESHOLD = 0.85

  static analyzeQuality(cards: CreateCardFeatureRequest[]): QualityReport {
    console.log('[CardQualitySupervisor] Iniciando análise de qualidade de', cards.length, 'cards')

    const issues: QualityIssue[] = []
    const cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }> = []
    const cardsToRemove: number[] = []
    const cardsToImprove: Array<{ index: number; suggestions: string[] }> = []

    // Check crítico: detectar mesma feature dividida em cards separados
    this.checkSameFeatureSplit(cards, issues, cardsToMerge)

    // Check 1: Detectar títulos duplicados
    this.checkDuplicateTitles(cards, issues, cardsToMerge)

    // Check 2: Detectar conteúdo duplicado ou muito similar
    this.checkDuplicateContent(cards, issues, cardsToMerge)

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

    this.logReport(report)
    return report
  }

  /**
   * Check crítico: detectar cards da MESMA feature que foram separados
   * Ex: "API de Auth" + "Interface de Auth" devem virar "Sistema de Auth"
   */
  private static checkSameFeatureSplit(
    cards: CreateCardFeatureRequest[],
    issues: QualityIssue[],
    cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }>
  ): void {
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const featureI = this.extractFeatureFromTitle(cards[i]!.title)
        const featureJ = this.extractFeatureFromTitle(cards[j]!.title)

        if (featureI && featureI === featureJ) {
          console.log(`[Supervisor] Mesma feature detectada: "${cards[i]!.title}" + "${cards[j]!.title}"`)

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

  private static checkDuplicateTitles(
    cards: CreateCardFeatureRequest[],
    issues: QualityIssue[],
    cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }>
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
        console.log(`[CardQualitySupervisor] Título duplicado encontrado: "${title}" (${indices.length} cards)`)

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
    cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }>
  ): void {
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const similarity = this.calculateContentSimilarity(cards[i]!, cards[j]!)

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          console.log(`[CardQualitySupervisor] Conteúdo similar encontrado entre cards #${i} e #${j} (similaridade: ${(similarity * 100).toFixed(0)}%)`)

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
    report: QualityReport
  ): { correctedCards: CreateCardFeatureRequest[]; mergesApplied: number; cardsRemoved: number } {
    console.log('\n[CardQualitySupervisor] Aplicando correções automáticas')
    console.log(`Cards originais: ${cards.length}`)
    console.log(`Merges a aplicar: ${report.cardsToMerge.length}`)
    console.log(`Cards a remover: ${report.cardsToRemove.length}`)

    let mergesApplied = 0
    let cardsRemoved = 0

    const { mergedCards, mergeCount } = this.applyMerges(cards, report.cardsToMerge)
    mergesApplied = mergeCount
    let workingCards = mergedCards

    const { filteredCards, removeCount } = this.removeCards(workingCards, report.cardsToRemove)
    cardsRemoved = removeCount
    workingCards = filteredCards

    console.log(`\n[CardQualitySupervisor] Resultado: ${workingCards.length} cards (${mergesApplied} merges, ${cardsRemoved} removidos)\n`)

    return {
      correctedCards: workingCards,
      mergesApplied,
      cardsRemoved
    }
  }

  private static applyMerges(
    cards: CreateCardFeatureRequest[],
    merges: Array<{ sourceIndex: number; targetIndex: number; reason: string }>
  ): { mergedCards: CreateCardFeatureRequest[]; mergeCount: number } {
    if (merges.length === 0) {
      return { mergedCards: [...cards], mergeCount: 0 }
    }

    console.log(`[CardQualitySupervisor] Aplicando ${merges.length} merge(s)...`)

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

      console.log(`\n[CardQualitySupervisor] Processando merge no target card #${targetIndex} "${targetCard.title}"`)

      for (const sourceIndex of sourceIndices) {
        const sourceCard = workingCards[sourceIndex]
        if (!sourceCard || toRemove.has(sourceIndex)) continue

        console.log(`[CardQualitySupervisor] Merge: "${sourceCard.title}" (#${sourceIndex}) -> "${targetCard.title}" (#${targetIndex})`)

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

    console.log(`[CardQualitySupervisor] ${mergeCount} merge(s) aplicado(s), ${toRemove.size} card(s) removido(s)`)

    return { mergedCards: result, mergeCount }
  }

  private static removeCards(
    cards: CreateCardFeatureRequest[],
    indicesToRemove: number[]
  ): { filteredCards: CreateCardFeatureRequest[]; removeCount: number } {
    if (indicesToRemove.length === 0) {
      return { filteredCards: [...cards], removeCount: 0 }
    }

    console.log(`\n[CardQualitySupervisor] Removendo ${indicesToRemove.length} card(s) de baixa qualidade`)

    const toRemove = new Set(indicesToRemove)
    const result = cards.filter((card, index) => {
      if (toRemove.has(index)) {
        console.log(`[CardQualitySupervisor] Removido: "${card.title}" (#${index})`)
        return false
      }
      return true
    })

    return { filteredCards: result, removeCount: indicesToRemove.length }
  }

  private static logReport(report: QualityReport): void {
    console.log('\n[CardQualitySupervisor] === RELATÓRIO DE QUALIDADE ===')
    console.log(`Total de cards analisados: ${report.totalCards}`)
    console.log(`Issues encontrados: ${report.issuesFound}`)
    console.log(`Cards sugeridos para merge: ${report.cardsToMerge.length}`)
    console.log(`Cards sugeridos para remoção: ${report.cardsToRemove.length}`)

    if (report.cardsToMerge.length > 0) {
      console.log('\n--- Sugestões de Merge ---')
      report.cardsToMerge.slice(0, 5).forEach((merge, index) => {
        console.log(`  ${index + 1}. Card #${merge.sourceIndex} -> Card #${merge.targetIndex} (${merge.reason})`)
      })
      if (report.cardsToMerge.length > 5) {
        console.log(`  ... e mais ${report.cardsToMerge.length - 5} sugestões`)
      }
    }

    console.log('='.repeat(50) + '\n')
  }
}
