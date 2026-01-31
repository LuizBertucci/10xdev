import type { CardFeature } from "@/types"

export const DEFAULT_CATEGORY = "Sem categoria"

export function buildCategoryGroups(cards: CardFeature[]) {
  const map = new Map<string, CardFeature[]>()

  cards.forEach((card) => {
    const tags = card.tags && card.tags.length > 0 ? card.tags : [DEFAULT_CATEGORY]
    tags.forEach((rawTag) => {
      const tag = rawTag?.trim() || DEFAULT_CATEGORY
      if (!map.has(tag)) {
        map.set(tag, [])
      }
      map.get(tag)?.push(card)
    })
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
