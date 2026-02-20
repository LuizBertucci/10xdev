#!/usr/bin/env ts-node

/**
 * Script para substituir o card ClawdBot pelo novo card Claude CLI + Ralph.
 * 1) Remove o card atual (00fa3cca-c83a-439f-84d7-683d5d6132a2)
 * 2) Cria novo card com instruções sobre Claude CLI e Ralph
 *
 * Uso: npx ts-node -r tsconfig-paths/register src/scripts/seed-claude-ralph-card.ts
 *
 * Requer: .env com SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: ADMIN_USER_ID para criar o card como um usuário específico
 */

import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath, override: true })

import { randomUUID } from 'crypto'
import { supabaseAdmin, executeQuery } from '@/database/supabase'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import {
  ContentType,
  CardType,
  Visibility,
  type CreateCardFeatureRequest,
  type CardFeatureScreen
} from '@/types/cardfeature'

const OLD_CARD_ID = '00fa3cca-c83a-439f-84d7-683d5d6132a2'

function block(
  type: ContentType,
  content: string,
  order: number,
  opts?: { language?: string; title?: string }
): { type: ContentType; content: string; order: number; language?: string; title?: string } {
  return { type, content, order, ...opts }
}

function screen(name: string, description: string, blocks: ReturnType<typeof block>[]): CardFeatureScreen {
  return {
    name,
    description,
    blocks: blocks.map(b => {
      const block: { id: string; type: ContentType; content: string; order: number; language?: string; title?: string } = {
        id: randomUUID(),
        type: b.type,
        content: b.content,
        order: b.order
      }
      if (b.language) block.language = b.language
      if (b.title) block.title = b.title
      return block
    })
  }
}

function buildNewCardContent(): CreateCardFeatureRequest {
  return {
    title: 'Claude CLI + Ralph: Desenvolvimento Assistido por IA',
    description: 'Guia completo para Claude CLI (Cursor/Claude Code) e Ralph (agente em loop determinístico)',
    tech: 'Claude CLI',
    language: 'typescript',
    content_type: ContentType.CODE,
    card_type: CardType.CODIGOS,
    visibility: Visibility.PUBLIC,
    screens: [
      screen(
        'Claude CLI - Visão Geral',
        'Conceito e recursos principais do Claude CLI',
        [
          block(
            ContentType.TEXT,
            'O Claude CLI é a interface de linha de comando do Claude, disponível no Cursor e em outras ferramentas. Permite interagir com o assistente de IA diretamente no terminal, ideal para tarefas de desenvolvimento automatizadas.\n\nRecursos principais:\n- Completar código e comandos\n- Executar tarefas em sequência (microtarefas)\n- Integração com editores e fluxos de trabalho\n- Suporte a contextos via arquivos e pastas',
            0
          )
        ]
      ),
      screen(
        'Claude CLI - Instalação e Setup',
        'Como instalar e configurar o Claude CLI',
        [
          block(
            ContentType.TEXT,
            'Instalação via npm (recomendado para uso com Ralph e scripts):',
            0
          ),
          block(
            ContentType.CODE,
            'npm install -g @anthropic-ai/claude',
            1,
            { language: 'bash', title: 'Instalar Claude CLI globalmente' }
          ),
          block(
            ContentType.TEXT,
            'Alternativa: o Cursor já inclui o Claude CLI. Verifique com `claude --version`.\n\nConfiguração: defina ANTHROPIC_API_KEY no .env ou export para uso via terminal.',
            2
          ),
          block(
            ContentType.CODE,
            'export ANTHROPIC_API_KEY="sua-chave-aqui"',
            3,
            { language: 'bash' }
          )
        ]
      ),
      screen(
        'Claude CLI - Comandos Essenciais',
        'Comandos básicos e avançados',
        [
          block(
            ContentType.TEXT,
            'Comandos básicos:',
            0
          ),
          block(
            ContentType.CODE,
            'claude "Explique este arquivo"\nclaude --file src/app.ts "Refatore a função X"',
            1,
            { language: 'bash' }
          ),
          block(
            ContentType.TEXT,
            'Uso típico em desenvolvimento: passar contexto (arquivos, pastas) e instruções claras. O CLI processa e retorna sugestões ou alterações.',
            2
          )
        ]
      ),
      screen(
        'Ralph - Conceito e Filosofia',
        'O que é Ralph e por que usar',
        [
          block(
            ContentType.TEXT,
            'Ralph é um agente em loop determinístico que executa microtarefas do PRD.json. Cada loop roda uma única microtarefa, valida com lint/build e commita.\n\nVantagens:\n- Feedback forte: lint e testes a cada passo\n- Diffs pequenos e seguros\n- Registro de decisões no PRD\n- Sem paralelismo: execução sequencial evita erros de concorrência',
            0
          )
        ]
      ),
      screen(
        'Ralph - Comandos e Controle',
        'Script ralph.sh e integração npm',
        [
          block(
            ContentType.TEXT,
            'Comandos de controle (definidos no PRD.json):',
            0
          ),
          block(
            ContentType.CODE,
            '# Iniciar Ralph em background\n./scripts/ralph.sh > ralph.log 2>&1 &\n\n# Verificar status\npgrep -af ralph.sh || echo "Ralph não está rodando"\n\n# Parar Ralph\npkill -f ralph.sh',
            1,
            { language: 'bash', title: 'Controle do Ralph' }
          ),
          block(
            ContentType.TEXT,
            'Integração: o script lê docs/ralph/PRD.json, executa a próxima microtarefa pendente e atualiza o status.',
            2
          )
        ]
      ),
      screen(
        'Ralph - Estrutura do PRD.json',
        'Estrutura de tarefas e microtarefas',
        [
          block(
            ContentType.TEXT,
            'Estrutura básica do PRD:',
            0
          ),
          block(
            ContentType.CODE,
            '{\n  "task_sequence": ["task_a", "task_b"],\n  "tasks": [{\n    "id": "task_a",\n    "status": "pending",\n    "microtasks": [{\n      "id": "mt_1",\n      "title": "...",\n      "status": "pending",\n      "tests": ["npm run lint"]\n    }]\n  }]\n}',
            1,
            { language: 'json' }
          ),
          block(
            ContentType.TEXT,
            'Cada microtarefa tem: id, title, status (pending|in_progress|done), tests (comandos de validação) e notes (após conclusão).',
            2
          )
        ]
      ),
      screen(
        'Ralph - Workflow Completo',
        'Fluxo de execução e boas práticas',
        [
          block(
            ContentType.TEXT,
            'Fluxo de cada loop:\n1) Ler PRD e pegar próxima microtarefa pending\n2) Executar apenas essa microtarefa\n3) Rodar lint/build/testes listados\n4) Marcar done, registrar notas e update\n5) Commit com mensagem descritiva\n6) Encerrar para o runner chamar novamente',
            0
          ),
          block(
            ContentType.CODE,
            'npm --prefix backend run lint\nnpm --prefix backend run build',
            1,
            { language: 'bash', title: 'Exemplo de validação (backend)' }
          ),
          block(
            ContentType.TEXT,
            'Boas práticas: uma microtarefa por loop, diffs pequenos, não atualizar deps sem necessidade, usar npm --prefix quando rodar do root.',
            2
          )
        ]
      )
    ]
  }
}

async function getAdminUserId(): Promise<string> {
  const envUserId = process.env.ADMIN_USER_ID
  if (envUserId) return envUserId

  const { data } = await executeQuery<{ id: string }[] | null>(
    supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
  )

  const admin = Array.isArray(data) ? data[0] : null
  if (admin?.id) return admin.id

  const { data: anyUser } = await executeQuery<{ id: string }[] | null>(
    supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)
  )
  const first = Array.isArray(anyUser) ? anyUser[0] : null
  if (first?.id) return first.id

  throw new Error(
    'Nenhum usuário encontrado. Configure ADMIN_USER_ID no .env ou crie um usuário no banco.'
  )
}

async function getOldCardCreatedBy(): Promise<string | null> {
  const { data } = await executeQuery<{ created_by: string | null } | null>(
    supabaseAdmin
      .from('card_features')
      .select('created_by')
      .eq('id', OLD_CARD_ID)
      .single()
  )
  return data?.created_by ?? null
}

async function main() {
  console.log('\n=== Seed: Substituir card Claude CLI + Ralph ===\n')

  const userId = await getAdminUserId()
  const oldCreatedBy = await getOldCardCreatedBy()
  const createAs = oldCreatedBy || userId

  // 1. Remover o card antigo
  console.log(`1) Removendo card antigo (${OLD_CARD_ID})...`)
  const { error: delError } = await executeQuery(
    supabaseAdmin
      .from('card_features')
      .delete()
      .eq('id', OLD_CARD_ID)
  )

  if (delError) {
    console.warn('Aviso: card antigo pode não existir ou já ter sido removido:', (delError as Error).message)
  } else {
    console.log('   Card antigo removido.')
  }

  // 2. Criar o novo card
  console.log('2) Criando novo card Claude CLI + Ralph...')
  const newCardData = buildNewCardContent()
  const result = await CardFeatureModel.create(newCardData, createAs, 'admin')

  if (!result.success) {
    console.error('Erro ao criar card:', result.error)
    process.exit(1)
  }

  console.log('   Novo card criado com sucesso.')
  console.log('   ID:', result.data?.id)
  console.log('   Título:', result.data?.title)
  console.log('   Telas:', result.data?.screens?.length ?? 0)
  console.log('\n=== Concluído ===\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
