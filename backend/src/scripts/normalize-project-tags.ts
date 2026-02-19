#!/usr/bin/env ts-node

/**
 * Script para normalizar tags de card_features existentes no banco.
 * Elimina duplicatas como "Project"/"Projeto", "Card"/"CardFeature",
 * e converte chaves cruas em ingles para nomes legiveis em portugues.
 *
 * Uso:
 *   npx tsx src/scripts/normalize-project-tags.ts              # todos os cards
 *   npx tsx src/scripts/normalize-project-tags.ts <project-id> # cards de um projeto
 *   npx tsx src/scripts/normalize-project-tags.ts --dry-run    # simular sem alterar
 */

import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath, override: true })

import { supabaseAdmin } from '@/database/supabase'
import { normalizeTags } from '@/utils/tagNormalization'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const projectId = args.find(a => a !== '--dry-run')

async function normalizeProjectTags() {
  console.log('\n=== Normalizacao de Tags de Card Features ===\n')
  if (dryRun) console.log('(MODO DRY-RUN: nenhuma alteracao sera feita)\n')

  // 1. Buscar cards com tags
  let query = supabaseAdmin
    .from('card_features')
    .select('id, title, tags, created_in_project_id')
    .not('tags', 'is', null)

  if (projectId) {
    console.log(`Filtrando por projeto: ${projectId}\n`)
    query = query.eq('created_in_project_id', projectId)
  }

  const { data: cards, error } = await query

  if (error) {
    console.error('Erro ao buscar cards:', error.message)
    process.exit(1)
  }

  if (!cards || cards.length === 0) {
    console.log('Nenhum card com tags encontrado.')
    process.exit(0)
  }

  console.log(`Cards encontrados: ${cards.length}\n`)

  let updatedCount = 0
  let skippedCount = 0
  const changes: Array<{ id: string; title: string; before: string[]; after: string[] }> = []

  for (const card of cards) {
    const originalTags: string[] = card.tags || []
    if (originalTags.length === 0) {
      skippedCount++
      continue
    }

    const normalizedTags = normalizeTags(originalTags)

    // Verificar se houve mudanca
    const changed = normalizedTags.length !== originalTags.length ||
      normalizedTags.some((t, i) => t !== originalTags[i])

    if (!changed) {
      skippedCount++
      continue
    }

    changes.push({
      id: card.id,
      title: card.title,
      before: originalTags,
      after: normalizedTags
    })

    if (!dryRun) {
      const { error: updateError } = await supabaseAdmin
        .from('card_features')
        .update({ tags: normalizedTags })
        .eq('id', card.id)

      if (updateError) {
        console.error(`  Erro ao atualizar card "${card.title}" (${card.id}):`, updateError.message)
        continue
      }
    }

    updatedCount++
  }

  // Relatorio
  console.log('\n=== Relatorio ===\n')

  if (changes.length > 0) {
    console.log('Mudancas:')
    for (const change of changes) {
      console.log(`\n  "${change.title}" (${change.id})`)
      console.log(`    Antes:  [${change.before.join(', ')}]`)
      console.log(`    Depois: [${change.after.join(', ')}]`)
    }
  }

  console.log(`\nTotal de cards: ${cards.length}`)
  console.log(`Atualizados: ${updatedCount}`)
  console.log(`Sem mudanca: ${skippedCount}`)

  if (dryRun) {
    console.log('\n(DRY-RUN: nenhuma alteracao foi feita. Remova --dry-run para aplicar.)')
  }

  console.log('')
}

normalizeProjectTags().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
