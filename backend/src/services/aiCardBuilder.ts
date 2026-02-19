import { randomUUID } from 'crypto'
import { ContentType, CardType, Visibility } from '@/types/cardfeature'
import type { CardFeatureScreen, ContentBlock, CreateCardFeatureRequest } from '@/types/cardfeature'
import type { FileEntry } from './githubService'
import { cleanMarkdown } from '@/utils/markdownUtils'
import { getFileExtension, getLanguageFromExtension } from '@/utils/fileFilters'

// ================================================
// INTERFACES INTERNAS
// ================================================

export interface AiCardFile {
  path: string
  content?: string
}

export interface AiCardScreen {
  name: string
  description: string
  files: AiCardFile[]
}

export interface AiCard {
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

export interface AiOutput {
  cards?: AiCard[]
}

// ================================================
// NORMALIZE AI OUTPUT
// ================================================

/**
 * Normalizes raw AI output to match AiOutput expectations.
 * Handles various LLM response formats by mapping name→title, populating
 * missing descriptions, ensuring proper types, and filtering invalid entries.
 */
export function normalizeAiOutput(raw: unknown): AiOutput {
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
          .map((s: unknown, screenIdx: number) => {
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

// ================================================
// BUILD FUNCTIONS
// ================================================

export function createContentBlock(file: FileEntry, order: number): ContentBlock {
  const ext = getFileExtension(file.path)
  return {
    id: randomUUID(),
    type: ContentType.CODE,
    content: file.content,
    language: getLanguageFromExtension(ext),
    title: file.path.split('/').pop() || file.path,
    route: file.path,
    order
  }
}

export function buildCard(
  featureName: string,
  screens: CardFeatureScreen[],
  tech: string,
  lang: string,
  _featureFiles: FileEntry[],
  aiOverrides?: { title: string; description?: string; tech?: string; language?: string; category?: string; tags?: string[] }
): CreateCardFeatureRequest {
  return {
    title: aiOverrides?.title ? cleanMarkdown(aiOverrides.title) : featureName,
    description: cleanMarkdown(aiOverrides?.description || ''),
    tech: aiOverrides?.tech || tech,
    language: aiOverrides?.language || lang,
    content_type: ContentType.CODE,
    card_type: CardType.CODIGOS,
    category: aiOverrides?.category || featureName,
    tags: aiOverrides?.tags || [],
    visibility: Visibility.UNLISTED,
    screens
  }
}

export function buildCardsFromAiOutput(aiCards: AiCard[], files: FileEntry[]): CreateCardFeatureRequest[] {
  const fileMap = new Map<string, FileEntry>()
  files.forEach(f => fileMap.set(f.path, f))

  const resultCards: CreateCardFeatureRequest[] = []

  for (const aiCard of aiCards) {
    const screens: CardFeatureScreen[] = []
    const rawScreens = aiCard.screens
    const screenArray = Array.isArray(rawScreens) ? rawScreens : []

    for (const screen of screenArray) {
      const screenObj = screen as AiCardScreen
      const blocks: ContentBlock[] = []
      const screenFiles = screenObj.files || []

      for (const fileItem of screenFiles) {
        const filePath = typeof fileItem === 'string' ? fileItem : fileItem.path
        const file = fileMap.get(filePath)
        if (file) {
          blocks.push(createContentBlock(file, blocks.length))
        }
      }

      if (blocks.length > 0) {
        screens.push({
          name: screenObj.name || 'Screen',
          description: screenObj.description || '',
          route: '',
          blocks
        })
      }
    }

    if (screens.length > 0) {
      const cardOverrides: { title: string; description?: string; category?: string; tags?: string[] } = {
        title: aiCard.title || 'Card',
        description: aiCard.description || '',
        tags: Array.isArray(aiCard.tags) ? aiCard.tags : []
      }

      if (aiCard.category) {
        cardOverrides.category = aiCard.category
      }

      const card = buildCard(
        aiCard.category || 'misc',
        screens,
        String(aiCard.tech || 'General'),
        String(aiCard.language || 'typescript'),
        files,
        cardOverrides
      )

      resultCards.push(card)
    }
  }

  return resultCards
}
