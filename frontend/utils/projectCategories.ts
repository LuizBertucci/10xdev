import type { CardFeature } from "@/types"
import { getMacroCategory } from "./macroCategories"

export const DEFAULT_CATEGORY = "Sem categoria"

export type GroupingMode = 'project' | 'macro'

export function buildCategoryGroups(cards: CardFeature[], mode: GroupingMode = 'project') {
  const map = new Map<string, CardFeature[]>()

  cards.forEach((card) => {
    let category: string
    if (mode === 'macro') {
      const macro = (card as { macro_category?: string }).macro_category
        || getMacroCategory(card.tags || [], card.category)
      category = macro || DEFAULT_CATEGORY
    } else {
      category = card.category?.trim()
        || (card.tags && card.tags.length > 0 ? card.tags[0]?.trim() : null)
        || DEFAULT_CATEGORY
    }

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
