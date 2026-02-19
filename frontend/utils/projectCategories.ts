import type { CardFeature } from "@/types"

export const DEFAULT_CATEGORY = "Sem categoria"

export function buildCategoryGroups(cards: CardFeature[]) {
  const map = new Map<string, CardFeature[]>()

  cards.forEach((card) => {
    const category = card.category?.trim()
      || (card.tags && card.tags.length > 0 ? card.tags[0]?.trim() : null)
      || DEFAULT_CATEGORY

    if (!map.has(category)) {
      map.set(category, [])
    }
    map.get(category)?.push(card)
  })

  return map
}

export function getAllCategories(groups: Map<string, CardFeature[]>) {
  return Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"))
}

export function orderCategories(allCategories: string[], orderedCategories: string[] = []) {
  if (orderedCategories.length === 0) {
    return allCategories
  }

  const ordered = [...orderedCategories]
  const orderedSet = new Set(orderedCategories)

  allCategories.forEach((category) => {
    if (!orderedSet.has(category)) {
      ordered.push(category)
    }
  })

  return ordered.filter((category) => allCategories.includes(category))
}
