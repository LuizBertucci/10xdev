/**
 * Utilitários para categorização aprimorada de cards
 * Agrupa cards em macro-categorias para melhor organização
 */

export const MACRO_CATEGORIES = {
  'Frontend': {
    description: 'Componentes, interfaces e experiência do usuário',
    priority: 1,
    keywords: ['Frontend', 'UI', 'Componentes', 'React', 'Vue', 'Angular', 'Estilização', 'Estado', 'Hooks']
  },
  'Backend': {
    description: 'APIs, serviços e lógica de servidor',
    priority: 2,
    keywords: ['Backend', 'APIs', 'Services', 'Controllers', 'Models', 'Database']
  },
  'Fullstack': {
    description: 'Aplicações completas integrando frontend e backend',
    priority: 3,
    keywords: ['Fullstack', 'Autenticação', 'Usuários', 'Pagamentos', 'Notificações']
  },
  'DevOps': {
    description: 'Infraestrutura, deployment e configuração',
    priority: 4,
    keywords: ['DevOps', 'Configuração', 'Build', 'Deploy', 'Infraestrutura']
  },
  'Conteúdo': {
    description: 'Documentação, tutoriais e guias',
    priority: 5,
    keywords: ['Conteúdo', 'Documentação', 'Tutoriais', 'Guias']
  },
  'Ferramentas': {
    description: 'Utilitários, scripts e ferramentas auxiliares',
    priority: 6,
    keywords: ['Ferramentas', 'Utilitários', 'Helpers', 'Scripts', 'Templates']
  },
  'Testes': {
    description: 'Testes automatizados e garantia de qualidade',
    priority: 7,
    keywords: ['Testes', 'Quality', 'Unit', 'Integration', 'E2E']
  },
  'Outros': {
    description: 'Categorias diversas ou não classificadas',
    priority: 8,
    keywords: ['Outros']
  }
}

/**
 * Lista de macro-categorias válidas para exibição (badge omitido quando fora desta lista)
 */
export const MACRO_CATEGORY_KEYS = Object.keys(MACRO_CATEGORIES) as string[]

/**
 * Determina a macro-categoria principal de um card baseado em tags e/ou category
 */
export function getMacroCategory(tags: string[] = [], category?: string | null): string | null {
  const combined = [...(category ? [category] : []), ...(tags || [])].filter(Boolean)
  if (combined.length === 0) return null

  // Match exato: category ou tag está em MACRO_CATEGORY_KEYS
  for (const key of MACRO_CATEGORY_KEYS) {
    if (combined.some(t => t.trim().toLowerCase() === key.toLowerCase())) return key
  }

  // Procura por match exato em keywords
  for (const [macroCategory, config] of Object.entries(MACRO_CATEGORIES)) {
    if (combined.some(tag => config.keywords.some(keyword =>
      tag.toLowerCase() === keyword.toLowerCase()
    ))) {
      return macroCategory
    }
  }

  // Procura por match parcial
  for (const [macroCategory, config] of Object.entries(MACRO_CATEGORIES)) {
    if (combined.some(tag => config.keywords.some(keyword =>
      tag.toLowerCase().includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(tag.toLowerCase())
    ))) {
      return macroCategory
    }
  }

  // Fallback baseado em heurísticas
  const tagText = combined.join(' ').toLowerCase()

  if (tagText.match(/component|ui|button|input|dialog|modal/)) return 'Frontend'
  if (tagText.match(/api|controller|service|model|database/)) return 'Backend'
  if (tagText.match(/auth|user|payment|notification/)) return 'Fullstack'
  if (tagText.match(/config|build|deploy|docker/)) return 'DevOps'
  if (tagText.match(/doc|tutorial|guide/)) return 'Conteúdo'
  if (tagText.match(/test|spec|e2e|unit/)) return 'Testes'

  return 'Ferramentas'
}

/**
 * Agrupa cards por macro-categorias para o sumário
 */
export function groupCardsByMacroCategory(cards: unknown[]): Record<string, unknown[]> {
  const grouped: Record<string, unknown[]> = {}

  // Inicializa todas as macro-categorias
  Object.keys(MACRO_CATEGORIES).forEach(macroCategory => {
    grouped[macroCategory] = []
  })

  // Agrupa os cards
  cards.forEach(card => {
    const cardObj = card as { tags?: string[]; category?: string }
    const macroCategory = getMacroCategory(cardObj.tags || [], cardObj.category) || 'Ferramentas'
    grouped[macroCategory].push(card)
  })

  // Remove categorias vazias e ordena por prioridade
  const filteredGrouped: Record<string, unknown[]> = {}
  Object.entries(MACRO_CATEGORIES)
    .sort(([,a], [,b]) => a.priority - b.priority)
    .forEach(([macroCategory]) => {
      if ((grouped[macroCategory] as unknown[]).length > 0) {
        filteredGrouped[macroCategory] = grouped[macroCategory]
      }
    })

  return filteredGrouped
}

/**
 * Gera estatísticas das macro-categorias para o sumário
 */
export function getMacroCategoryStats(cards: unknown[]): Array<{
  category: string
  count: number
  description: string
  priority: number
}> {
  const grouped = groupCardsByMacroCategory(cards)

  return Object.entries(grouped).map(([category, cards]) => ({
    category,
    count: (cards as unknown[]).length,
    description: MACRO_CATEGORIES[category as keyof typeof MACRO_CATEGORIES]?.description || '',
    priority: MACRO_CATEGORIES[category as keyof typeof MACRO_CATEGORIES]?.priority || 999
  }))
}