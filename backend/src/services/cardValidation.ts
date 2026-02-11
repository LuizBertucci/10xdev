import { ContentType, CardType } from '@/types/cardfeature'
import type { CreateCardFeatureRequest, ContentBlock, CardFeatureScreen } from '@/types/cardfeature'

const ALLOWED_BLOCK_TYPES = new Set<string>(Object.values(ContentType))
const VALID_CARD_TYPES = new Set<string>(Object.values(CardType))

export interface ValidationError {
  field: string
  message: string
}

export interface CardValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Valida um card antes da criação.
 * Retorna erros específicos por campo em vez de falha genérica.
 */
export function validateCard(card: CreateCardFeatureRequest): CardValidationResult {
  const errors: ValidationError[] = []

  if (!card.title || typeof card.title !== 'string') {
    errors.push({ field: 'title', message: 'Título é obrigatório' })
  } else if (!card.title.trim()) {
    errors.push({ field: 'title', message: 'Título não pode ser vazio' })
  }

  if (!card.card_type || !VALID_CARD_TYPES.has(card.card_type)) {
    errors.push({ field: 'card_type', message: `card_type deve ser "${CardType.CODIGOS}" ou "${CardType.POST}"` })
  }

  if (!card.content_type || !ALLOWED_BLOCK_TYPES.has(card.content_type)) {
    errors.push({
      field: 'content_type',
      message: `content_type deve ser um de: ${[...ALLOWED_BLOCK_TYPES].join(', ')}`
    })
  }

  if (!card.description || typeof card.description !== 'string') {
    errors.push({ field: 'description', message: 'Descrição é obrigatória' })
  } else if (card.description.trim().length < 1) {
    errors.push({ field: 'description', message: 'Descrição deve ter pelo menos 1 caractere' })
  }

  if (!Array.isArray(card.screens)) {
    errors.push({ field: 'screens', message: 'screens deve ser um array' })
  } else if (card.screens.length === 0) {
    errors.push({ field: 'screens', message: 'screens deve ter pelo menos uma tela' })
  } else {
    for (let i = 0; i < card.screens.length; i++) {
      const screen = card.screens[i] as CardFeatureScreen
      if (!screen.blocks || !Array.isArray(screen.blocks)) {
        errors.push({ field: `screens[${i}].blocks`, message: 'Cada tela deve ter um array de blocos' })
      } else if (screen.blocks.length === 0) {
        errors.push({ field: `screens[${i}]`, message: `Tela "${screen.name || i}" não tem blocos` })
      } else {
        for (let j = 0; j < screen.blocks.length; j++) {
          const block = screen.blocks[j] as ContentBlock
          if (!block.type || !ALLOWED_BLOCK_TYPES.has(block.type)) {
            errors.push({
              field: `screens[${i}].blocks[${j}].type`,
              message: `Tipo de bloco inválido: ${block.type}. Deve ser um de: ${[...ALLOWED_BLOCK_TYPES].join(', ')}`
            })
          }
          if (typeof block.content !== 'string') {
            errors.push({ field: `screens[${i}].blocks[${j}].content`, message: 'Conteúdo do bloco deve ser string' })
          }
          if (typeof block.order !== 'number') {
            errors.push({ field: `screens[${i}].blocks[${j}].order`, message: 'order do bloco deve ser número' })
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
