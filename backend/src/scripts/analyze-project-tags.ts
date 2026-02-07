#!/usr/bin/env ts-node

import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath, override: true })

import { supabaseAdmin } from '@/database/supabase'

const PROJECT_ID = process.argv[2] || '132f016e-a328-46fc-9483-ac1329b4e90f'

async function main() {
  console.log(`\nAnalisando tags do projeto: ${PROJECT_ID}\n`)

  // Buscar via created_in_project_id
  const { data: cards, error } = await supabaseAdmin
    .from('card_features')
    .select('id, title, tags, category')
    .eq('created_in_project_id', PROJECT_ID)

  if (error) {
    console.error('Erro:', error.message)
    return
  }

  // Fallback via project_cards
  if (!cards || cards.length === 0) {
    const { data: pc, error: pcErr } = await supabaseAdmin
      .from('project_cards')
      .select('card_feature_id')
      .eq('project_id', PROJECT_ID)

    if (pcErr || !pc || pc.length === 0) {
      console.log('Nenhum card encontrado')
      return
    }

    const ids = pc.map((r) => r.card_feature_id)
    const result = await supabaseAdmin
      .from('card_features')
      .select('id, title, tags, category')
      .in('id', ids)

    if (result.error || !result.data) {
      console.error('Erro:', result.error?.message)
      return
    }
    cards = result.data
  }

  console.log(`Total de cards: ${cards.length}\n`)

  // Tags unicas com contagem
  const tagCounts = new Map<string, number>()
  for (const card of cards) {
    for (const tag of (card.tags || [])) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  console.log('=== TAGS UNICAS (com contagem) ===')
  const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [tag, count] of sorted) {
    console.log(`  ${count}x  ${tag}`)
  }
  console.log(`\nTotal de tags unicas: ${tagCounts.size}`)

  // Campo category
  const catCounts = new Map<string, number>()
  for (const card of cards) {
    const cat = card.category || '(sem category)'
    catCounts.set(cat, (catCounts.get(cat) || 0) + 1)
  }
  console.log('\n=== CATEGORIES (campo category) ===')
  for (const [cat, count] of [...catCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}x  ${cat}`)
  }

  // Cards detalhados
  console.log('\n=== CARDS E SUAS TAGS ===')
  for (const card of cards) {
    console.log(`  ${card.title}`)
    console.log(`    tags: [${(card.tags || []).join(', ')}]`)
    console.log(`    category: ${card.category || '(vazio)'}`)
  }
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
