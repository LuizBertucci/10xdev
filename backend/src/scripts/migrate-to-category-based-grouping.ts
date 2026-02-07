#!/usr/bin/env ts-node

/**
 * Script para migrar categorias de cards existentes para o campo categori.
 * Usa category da IA quando disponível, ou classifica por layer/tags como fallback.
 *
 * Uso:
 *   npx tsx src/scripts/migrate-to-category-based-grouping.ts              # todos os cards
 *   npx tsx src/scripts/migrate-to-category-based-grouping.ts <project-id> # cards de um projeto
 *   npx tsx src/scripts/migrate-to-category-based-grouping.ts --dry-run    # simular sem alterar
 */

import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath, override: true })

import { supabaseAdmin } from '@/database/supabase'
import { normalizeTag } from '@/utils/tagNormalization'
import { normalizeTags } from '@/utils/tagNormalization'

// Mapa de fallback rápido (subset de tagNormalization.ts)
const TAG_FALLBACK: Record<string, string> = {
  'auth': 'Autenticação',
  'user': 'Gestão de Usuários',
  'payment': 'Pagamentos e Cobrança',
  'database': 'Acesso a Banco de Dados',
  'n8n': 'Automação e Workflows',
  'ai': 'Inteligência Artificial',
  'notification': 'Notificações e Emails',
  'card': 'Sistema de Cards',
  'project': 'Gestão de Projetos',
  'template': 'Templates e Layouts',
  'content': 'Gestão de Conteúdo',
  'admin': 'Painel Administrativo',
  'api': 'Clientes HTTP e APIs',
  'storage': 'Upload e Armazenamento',
  'middleware': 'Middlewares e Interceptors',
  'routing': 'Rotas e Navegação',
  'ui': 'Componentes de Interface',
  'docs': 'Documentação',
  'skill': 'Skills e Tutoriais',
  'utils': 'Funções Utilitárias',
  'config': 'Configuração do Projeto',
  'test': 'Testes Automatizados',
  'build': 'Build e Ferramentas',
  'style': 'Estilos e Temas',
  'hook': 'React Hooks',
  'controller': 'Endpoints e Controllers',
  'service': 'Lógica de Negócio',
  'validation': 'Validação de Dados'
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const projectId = args.find(a => a !== '--dry-run')

const CATEGORY_DO_SCHEME = 'Outros'

// Categorias válidas conhecidas (Feature_TITLES do githubService e outras)
const VALID_CATEGORIES = [
  'Autenticação e Login', 'Gestão de Usuários', 'Pagamentos e Cobrança',
  'Acesso a Banco de Dados', 'Automação e Workflows', 'Inteligência Artificial',
  'Notificações e Emails', 'Sistema de Cards', 'Gestão de Projetos',
  'Templates e Layouts', 'Gestão de Conteúdo', 'Painel Administrativo',
  'Clientes HTTP e APIs', 'Upload e Armazenamento', 'Middlewares e Interceptors',
  'Rotas e Navegação', 'Componentes de Interface', 'Documentação',
  'Skills e Tutoriais', 'Funções Utilitárias', 'Configuração do Projeto',
  'Testes Automatizados', 'Build e Ferramentas', 'Estilos e Temas',
  'React Hooks', 'Endpoints e Controllers', 'Lógica de Negócio',
  'Validação de Dados', 'Tarefas em Background', 'Autenticação',
  'Usuarios', 'Administração', 'Cliente de API', 'Armazenamento',
  'Conteúdo', 'Workflows n8n', 'Cards', 'Projetos', 'Template',
  'Docs', 'Utils', 'Config', 'Test', 'Build', 'Style', 'Hook',
  'Frontend', 'Backend', 'Fullstack', 'DevOps', 'Ferramentas',
  'api', 'auth', 'user', 'payment', 'database', 'n8n', 'ai',
  'notification', 'card', 'project', 'template', 'content', 'admin',
  'ui', 'utils', 'config', 'test', 'build', 'style'
]

// Padrões para detectar nomes internos/incorretos de category
const BAD_CATEGORY_PATTERNS = [
  /^[a-z][a-z0-9]*[A-Z]/i,  // camelCase com espaço (AppPublic, Publichome, Aulasmenu)
]

function isBadCategory(category: string): boolean {
  if (!category) return true
  const normalized = category.trim()
  
  // Se tem espaço, provavelmente é um nome legível válido (ex: "Autenticação e Login")
  if (normalized.includes(' ')) {
    return !VALID_CATEGORIES.some(cat => normalized.toLowerCase().includes(cat.toLowerCase()))
  }
  
  // Categorias curtas demais (exceto válidas conhecidas)
  if (normalized.length < 3 && !VALID_CATEGORIES.includes(normalized)) return true
  
  // Se está na lista de válidas, não é ruim
  if (VALID_CATEGORIES.includes(normalized)) return false
  if (VALID_CATEGORIES.includes(normalized.toLowerCase())) return false
  
  // Checar padrões ruins
  if (BAD_CATEGORY_PATTERNS.some(pattern => pattern.test(normalized))) return true
  
  if (normalized === 'geral' || normalized === 'Geral' || normalized === 'default' || normalized === 'Default') return true
  
  return false
}

function inferCategoryFromTags(tags: string[] | null): string {
  if (!tags || tags.length === 0) return CATEGORY_DO_SCHEME
  
  const firstTag = normalizeTag(tags[0]!) || tags[0]!
  
  // Se a tag já for uma categoria válida, usa ela
  if (!isBadCategory(firstTag)) return firstTag
  
  // Tenta encontrar no mapa de fallback
  const tagKey = tags[0]!.toLowerCase()
  if (TAG_FALLBACK[tagKey]) return TAG_FALLBACK[tagKey]
  
  // Tenta normalizar e mapear
  const normalized = normalizeTag(firstTag)
  if (!isBadCategory(normalized)) return normalized
  
  return CATEGORY_DO_SCHEME
}

async function migrateToCategoryBasedGrouping() {
  console.log('\n=== Migração para Grouping por Category ===\n')
  if (dryRun) console.log('(MODO DRY-RUN: nenhuma alteração será feita)\n')

  let query = supabaseAdmin
    .from('card_features')
    .select('id, title, category, tags, created_in_project_id')
    .order('created_at', { ascending: false })

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
    console.log('Nenhum card encontrado.')
    process.exit(0)
  }

  console.log(`Cards encontrados: ${cards.length}\n`)

  let updatedCount = 0
  let skippedCount = 0
  const changes: Array<{ id: string; title: string; before: string | null; after: string }> = []

  for (const card of cards) {
    const originalCategory = card.category
    const tags = card.tags || []

    if (originalCategory && !isBadCategory(originalCategory)) {
      skippedCount++
      continue
    }

    let newCategory: string | null = null

    if (originalCategory && isBadCategory(originalCategory)) {
      newCategory = tags.length > 0 ? inferCategoryFromTags(tags) : CATEGORY_DO_SCHEME
    } else if (!originalCategory) {
      const firstTag = tags.length > 0 ? normalizeTag(tags[0]) : null
      newCategory = firstTag && !isBadCategory(firstTag) ? firstTag : CATEGORY_DO_SCHEME
    }

    if (!newCategory || newCategory === originalCategory) {
      skippedCount++
      continue
    }

    changes.push({
      id: card.id,
      title: card.title,
      before: originalCategory,
      after: newCategory
    })

    if (!dryRun) {
      const { error: updateError } = await supabaseAdmin
        .from('card_features')
        .update({ category: newCategory })
        .eq('id', card.id)

      if (updateError) {
        console.error(`  Erro ao atualizar card "${card.title}" (${card.id}):`, updateError.message)
        continue
      }
    }

    updatedCount++
  }

  console.log('\n=== Relatório ===\n')

  if (changes.length > 0) {
    console.log('Mudanças:')
    for (const change of changes.slice(0, 20)) {
      console.log(`\n  "${change.title}" (${change.id})`)
      console.log(`    Antes: ${change.before || '(vazio)'}`)
      console.log(`    Depois: ${change.after}`)
    }
    if (changes.length > 20) {
      console.log(`\n... e mais ${changes.length - 20} mudanças`)
    }
  }

  console.log(`\nTotal de cards: ${cards.length}`)
  console.log(`Atualizados: ${updatedCount}`)
  console.log(`Sem mudança: ${skippedCount}`)

  if (dryRun) {
    console.log('\n(DRY-RUN: nenhuma alteração foi feita. Remova --dry-run para aplicar.)')
  }

  console.log('')
}

migrateToCategoryBasedGrouping().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})