import type { CreateCardFeatureRequest, CardFeatureScreen } from '@/types/cardfeature'

/**
 * Tipos de problemas de qualidade detectados
 */
export enum QualityIssueType {
  DUPLICATE_TITLE = 'duplicate_title',
  DUPLICATE_CONTENT = 'duplicate_content',
  WEAK_CONTENT = 'weak_content',
  SINGLE_FILE_CARD = 'single_file_card',
  MISSING_DESCRIPTION = 'missing_description',
  TOO_MANY_SCREENS = 'too_many_screens',
  SIMILAR_TECH_LANGUAGE = 'similar_tech_language'
}

/**
 * Representa um problema de qualidade detectado
 */
export interface QualityIssue {
  type: QualityIssueType
  severity: 'low' | 'medium' | 'high'
  cardIndex: number
  relatedCardIndex?: number
  message: string
  suggestion?: string
}

/**
 * Resultado da análise de qualidade
 */
export interface QualityReport {
  totalCards: number
  issuesFound: number
  issues: QualityIssue[]
  cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }>
  cardsToRemove: number[]
  cardsToImprove: Array<{ index: number; suggestions: string[] }>
}

/**
 * Card Quality Supervisor
 *
 * Responsável por validar a qualidade dos cards gerados durante a importação do GitHub,
 * detectando duplicados, conteúdo fraco e outros problemas de qualidade.
 */
export class CardQualitySupervisor {
  private static readonly MIN_DESCRIPTION_LENGTH = 10
  private static readonly MIN_FILES_PER_CARD = 2
  private static readonly MAX_SCREENS_PER_CARD = 20
  private static readonly SIMILARITY_THRESHOLD = 0.85

  /**
   * Analisa a qualidade de um conjunto de cards
   */
  static analyzeQuality(cards: CreateCardFeatureRequest[]): QualityReport {
    console.log('[CardQualitySupervisor] Iniciando análise de qualidade de', cards.length, 'cards')

    const issues: QualityIssue[] = []
    const cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }> = []
    const cardsToRemove: number[] = []
    const cardsToImprove: Array<{ index: number; suggestions: string[] }> = []

    // Check 1: Detectar títulos duplicados
    this.checkDuplicateTitles(cards, issues, cardsToMerge)

    // Check 2: Detectar conteúdo duplicado ou muito similar
    this.checkDuplicateContent(cards, issues, cardsToMerge)

    // Check 3: Detectar conteúdo fraco (poucos arquivos, sem descrição, etc)
    this.checkWeakContent(cards, issues, cardsToImprove)

    // Check 4: Detectar cards com mesma tech/language que poderiam ser agrupados
    this.checkSimilarTechLanguage(cards, issues, cardsToMerge)

    // Check 5: Detectar cards com muitas screens que poderiam ser divididos
    this.checkTooManyScreens(cards, issues, cardsToImprove)

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
   * Check 1: Detectar títulos duplicados
   */
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

        // Registrar issue para cada duplicata
        for (let i = 1; i < indices.length; i++) {
          issues.push({
            type: QualityIssueType.DUPLICATE_TITLE,
            severity: 'high',
            cardIndex: indices[i]!,
            relatedCardIndex: indices[0]!,
            message: `Card "${cards[indices[i]!]!.title}" tem título duplicado com card #${indices[0]!}`,
            suggestion: 'Considerar merge dos cards'
          })

          // Sugerir merge
          cardsToMerge.push({
            sourceIndex: indices[i]!,
            targetIndex: indices[0]!,
            reason: `Títulos idênticos: "${cards[indices[0]!]!.title}"`
          })
        }
      }
    }
  }

  /**
   * Check 2: Detectar conteúdo duplicado ou muito similar
   */
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

          // Apenas sugerir merge se similaridade for muito alta
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

  /**
   * Check 3: Detectar conteúdo fraco
   */
  private static checkWeakContent(
    cards: CreateCardFeatureRequest[],
    issues: QualityIssue[],
    cardsToImprove: Array<{ index: number; suggestions: string[] }>
  ): void {
    cards.forEach((card, index) => {
      const suggestions: string[] = []

      // Verificar descrição
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

      // Verificar número de arquivos
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

  /**
   * Check 4: Detectar cards com mesma tech/language que poderiam ser agrupados
   */
  private static checkSimilarTechLanguage(
    cards: CreateCardFeatureRequest[],
    issues: QualityIssue[],
    cardsToMerge: Array<{ sourceIndex: number; targetIndex: number; reason: string }>
  ): void {
    const techLanguageMap = new Map<string, number[]>()

    cards.forEach((card, index) => {
      const key = `${card.tech || 'unknown'}-${card.language || 'unknown'}`
      if (!techLanguageMap.has(key)) {
        techLanguageMap.set(key, [])
      }
      techLanguageMap.get(key)!.push(index)
    })

    // Verificar grupos com mesma tech/language e títulos/conteúdo relacionados
    for (const [techLang, indices] of techLanguageMap) {
      if (indices.length > 1) {
        // Verificar se os títulos sugerem que são partes da mesma feature
        for (let i = 0; i < indices.length; i++) {
          for (let j = i + 1; j < indices.length; j++) {
            const cardI = cards[indices[i]!]!
            const cardJ = cards[indices[j]!]!

            if (this.areTitlesRelated(cardI.title, cardJ.title)) {
              console.log(`[CardQualitySupervisor] Cards relacionados encontrados: "${cardI.title}" e "${cardJ.title}" (mesma tech/language)`)

              issues.push({
                type: QualityIssueType.SIMILAR_TECH_LANGUAGE,
                severity: 'low',
                cardIndex: indices[j]!,
                relatedCardIndex: indices[i]!,
                message: `Cards "${cardI.title}" e "${cardJ.title}" têm tech/language similar e títulos relacionados`,
                suggestion: 'Considerar agrupamento em um único card com múltiplas screens'
              })

              cardsToMerge.push({
                sourceIndex: indices[j]!,
                targetIndex: indices[i]!,
                reason: `Tech/language similar (${techLang}) e títulos relacionados`
              })
            }
          }
        }
      }
    }
  }

  /**
   * Check 5: Detectar cards com muitas screens
   */
  private static checkTooManyScreens(
    cards: CreateCardFeatureRequest[],
    issues: QualityIssue[],
    cardsToImprove: Array<{ index: number; suggestions: string[] }>
  ): void {
    cards.forEach((card, index) => {
      const screenCount = card.screens?.length || 0

      if (screenCount > this.MAX_SCREENS_PER_CARD) {
        console.log(`[CardQualitySupervisor] Card "${card.title}" tem ${screenCount} screens (máximo recomendado: ${this.MAX_SCREENS_PER_CARD})`)

        issues.push({
          type: QualityIssueType.TOO_MANY_SCREENS,
          severity: 'low',
          cardIndex: index,
          message: `Card "${card.title}" tem ${screenCount} screens (máximo recomendado: ${this.MAX_SCREENS_PER_CARD})`,
          suggestion: 'Considerar dividir em múltiplos cards por área de responsabilidade'
        })

        const existing = cardsToImprove.find(c => c.index === index)
        if (existing) {
          existing.suggestions.push('Dividir em múltiplos cards menores')
        } else {
          cardsToImprove.push({
            index,
            suggestions: ['Dividir em múltiplos cards menores']
          })
        }
      }
    })
  }

  /**
   * Consolida lista de cards para remoção
   */
  private static consolidateRemovalList(issues: QualityIssue[], cardsToRemove: number[]): void {
    // Remover duplicados completos (título + conteúdo muito similar)
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

    // Cards que têm tanto título quanto conteúdo duplicado devem ser removidos
    for (const [cardIndex, cardIssues] of duplicatesByCard) {
      const hasTitleDupe = cardIssues.some(i => i.type === QualityIssueType.DUPLICATE_TITLE)
      const hasContentDupe = cardIssues.some(i => i.type === QualityIssueType.DUPLICATE_CONTENT && i.severity === 'high')

      if (hasTitleDupe && hasContentDupe) {
        cardsToRemove.push(cardIndex)
      }
    }
  }

  /**
   * Calcula similaridade de conteúdo entre dois cards
   */
  private static calculateContentSimilarity(cardA: CreateCardFeatureRequest, cardB: CreateCardFeatureRequest): number {
    // Extrair todos os arquivos (paths) de ambos os cards
    const filesA = this.extractFilePaths(cardA)
    const filesB = this.extractFilePaths(cardB)

    if (filesA.size === 0 || filesB.size === 0) return 0

    // Calcular Jaccard similarity
    const intersection = new Set([...filesA].filter(x => filesB.has(x)))
    const union = new Set([...filesA, ...filesB])

    return intersection.size / union.size
  }

  /**
   * Extrai todos os file paths de um card
   */
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

  /**
   * Conta o número total de arquivos em um card
   */
  private static countTotalFiles(card: CreateCardFeatureRequest): number {
    let count = 0
    card.screens?.forEach(screen => {
      count += screen.blocks?.length || 0
    })
    return count
  }

  /**
   * Verifica se dois títulos são relacionados
   */
  private static areTitlesRelated(titleA: string, titleB: string): boolean {
    const normA = this.normalizeString(titleA)
    const normB = this.normalizeString(titleB)

    // Extrair palavras-chave principais (ignorar conectores)
    const stopWords = ['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'para', 'com', 'sem', 'por', 'a', 'o', 'as', 'os', 'e', 'ou']
    const wordsA = normA.split(/\s+/).filter(w => !stopWords.includes(w))
    const wordsB = normB.split(/\s+/).filter(w => !stopWords.includes(w))

    // Verificar se há palavras em comum
    const commonWords = wordsA.filter(w => wordsB.includes(w))

    // Se pelo menos 50% das palavras são comuns, considerar relacionados
    const maxWords = Math.max(wordsA.length, wordsB.length)
    return maxWords > 0 && commonWords.length / maxWords >= 0.5
  }

  /**
   * Normaliza string para comparação
   */
  private static normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Aplica correções automáticas baseadas no relatório de qualidade
   * Retorna a lista de cards corrigida
   */
  static applyCorrections(
    cards: CreateCardFeatureRequest[],
    report: QualityReport
  ): { correctedCards: CreateCardFeatureRequest[]; mergesApplied: number; cardsRemoved: number } {
    console.log('[CardQualitySupervisor] Aplicando correções automáticas...')

    let mergesApplied = 0
    let cardsRemoved = 0

    // 1. Aplicar merges
    const { mergedCards, mergeCount } = this.applyMerges(cards, report.cardsToMerge)
    mergesApplied = mergeCount
    let workingCards = mergedCards

    // 2. Remover cards de baixa qualidade (duplicados completos)
    const { filteredCards, removeCount } = this.removeCards(workingCards, report.cardsToRemove)
    cardsRemoved = removeCount
    workingCards = filteredCards

    console.log('[CardQualitySupervisor] Correções aplicadas:')
    console.log(`  - Merges realizados: ${mergesApplied}`)
    console.log(`  - Cards removidos: ${cardsRemoved}`)
    console.log(`  - Cards finais: ${workingCards.length} (de ${cards.length} originais)`)

    return {
      correctedCards: workingCards,
      mergesApplied,
      cardsRemoved
    }
  }

  /**
   * Aplica merges de cards duplicados ou relacionados
   */
  private static applyMerges(
    cards: CreateCardFeatureRequest[],
    merges: Array<{ sourceIndex: number; targetIndex: number; reason: string }>
  ): { mergedCards: CreateCardFeatureRequest[]; mergeCount: number } {
    if (merges.length === 0) {
      return { mergedCards: [...cards], mergeCount: 0 }
    }

    console.log(`[CardQualitySupervisor] Aplicando ${merges.length} merge(s)...`)

    // Criar cópia dos cards
    const workingCards = [...cards]
    const toRemove = new Set<number>()

    // Agrupar merges por target (pode haver múltiplos sources para o mesmo target)
    const mergesByTarget = new Map<number, number[]>()
    for (const merge of merges) {
      if (!mergesByTarget.has(merge.targetIndex)) {
        mergesByTarget.set(merge.targetIndex, [])
      }
      mergesByTarget.get(merge.targetIndex)!.push(merge.sourceIndex)
    }

    let mergeCount = 0

    // Processar cada grupo de merge
    for (const [targetIndex, sourceIndices] of mergesByTarget) {
      const targetCard = workingCards[targetIndex]
      if (!targetCard) continue

      // Consolidar todos os sources no target
      for (const sourceIndex of sourceIndices) {
        const sourceCard = workingCards[sourceIndex]
        if (!sourceCard || toRemove.has(sourceIndex)) continue

        console.log(`[CardQualitySupervisor] Merge: "${sourceCard.title}" (#${sourceIndex}) -> "${targetCard.title}" (#${targetIndex})`)

        // Mesclar screens do source no target
        const targetScreenNames = new Set(targetCard.screens?.map(s => s.name) || [])

        for (const sourceScreen of sourceCard.screens || []) {
          // Se já existe uma screen com o mesmo nome, mesclar os blocks
          const existingScreenIndex = targetCard.screens?.findIndex(s => s.name === sourceScreen.name)

          if (existingScreenIndex !== undefined && existingScreenIndex >= 0 && targetCard.screens) {
            // Mesclar blocks evitando duplicatas (mesmo route)
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
            // Adicionar nova screen
            if (!targetCard.screens) targetCard.screens = []
            targetCard.screens.push(sourceScreen)
          }
        }

        // Melhorar descrição se a do source for mais detalhada
        if (sourceCard.description && sourceCard.description.length > (targetCard.description?.length || 0)) {
          targetCard.description = sourceCard.description
        }

        // Marcar source para remoção
        toRemove.add(sourceIndex)
        mergeCount++
      }
    }

    // Remover cards que foram mesclados (em ordem reversa para não afetar índices)
    const result = workingCards.filter((_, index) => !toRemove.has(index))

    console.log(`[CardQualitySupervisor] ${mergeCount} merge(s) aplicado(s), ${toRemove.size} card(s) removido(s)`)

    return { mergedCards: result, mergeCount }
  }

  /**
   * Remove cards de baixa qualidade
   */
  private static removeCards(
    cards: CreateCardFeatureRequest[],
    indicesToRemove: number[]
  ): { filteredCards: CreateCardFeatureRequest[]; removeCount: number } {
    if (indicesToRemove.length === 0) {
      return { filteredCards: [...cards], removeCount: 0 }
    }

    console.log(`[CardQualitySupervisor] Removendo ${indicesToRemove.length} card(s) de baixa qualidade...`)

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

  /**
   * Registra relatório no console
   */
  private static logReport(report: QualityReport): void {
    console.log('\n========================================')
    console.log('[CardQualitySupervisor] RELATÓRIO DE QUALIDADE')
    console.log('========================================')
    console.log(`Total de cards analisados: ${report.totalCards}`)
    console.log(`Issues encontrados: ${report.issuesFound}`)
    console.log(`Cards sugeridos para merge: ${report.cardsToMerge.length}`)
    console.log(`Cards sugeridos para remoção: ${report.cardsToRemove.length}`)
    console.log(`Cards sugeridos para melhoria: ${report.cardsToImprove.length}`)

    if (report.issues.length > 0) {
      console.log('\n--- Issues por Severidade ---')
      const bySeverity = {
        high: report.issues.filter(i => i.severity === 'high').length,
        medium: report.issues.filter(i => i.severity === 'medium').length,
        low: report.issues.filter(i => i.severity === 'low').length
      }
      console.log(`  Alta: ${bySeverity.high}`)
      console.log(`  Média: ${bySeverity.medium}`)
      console.log(`  Baixa: ${bySeverity.low}`)
    }

    if (report.cardsToMerge.length > 0) {
      console.log('\n--- Sugestões de Merge ---')
      report.cardsToMerge.slice(0, 5).forEach((merge, index) => {
        console.log(`  ${index + 1}. Card #${merge.sourceIndex} -> Card #${merge.targetIndex} (${merge.reason})`)
      })
      if (report.cardsToMerge.length > 5) {
        console.log(`  ... e mais ${report.cardsToMerge.length - 5} sugestões`)
      }
    }

    console.log('========================================\n')
  }
}
