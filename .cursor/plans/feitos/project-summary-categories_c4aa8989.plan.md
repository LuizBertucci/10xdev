---
name: project-summary-categories
overview: Add campo tags em card_features e expor um Sumário modal com categorias e nomes dos cards, sem UI de edição por enquanto.
todos:
  - id: backend-tags
    content: Adicionar coluna tags em card_features e atualizar tipos/model.
    status: completed
  - id: frontend-types
    content: Atualizar tipos frontend para tags.
    status: completed
  - id: summary-modal
    content: Botão Sumário + modal com categorias e lista de cards.
    status: completed
  - id: fallback-group
    content: Fallback Sem categoria.
    status: completed
  - id: verify-ui
    content: Revisar layout no desktop/mobile.
    status: in_progress
isProject: false
---

# Plan: Sumário por Categoria com Tags no Card

## Contexto e decisões

- Fonte de categoria: campo `tags` no próprio card (`card_features`).
- Mudança será aplicada diretamente no Supabase via MCP (sem arquivo de migration no repo).
- Sem UI de edição por enquanto; apenas leitura no Sumário.

## Arquivos principais

- Supabase (MCP): alteração de schema diretamente na tabela `card_features`
- Tipos/backend: [`backend/src/types/cardfeature.ts`](backend/src/types/cardfeature.ts)
- Model/backend: [`backend/src/models/CardFeatureModel.ts`](backend/src/models/CardFeatureModel.ts)
- Serviço/GitHub import (opcional para valor default): [`backend/src/services/githubService.ts`](backend/src/services/githubService.ts)
- UI: [`frontend/pages/ProjectDetail.tsx`](frontend/pages/ProjectDetail.tsx)
- Tipos frontend: [`frontend/types/cardfeature.ts`](frontend/types/cardfeature.ts)

## Plano

1) **Persistência de tags no backend**

- Aplicar alteração no Supabase via MCP: adicionar coluna `tags` (ex.: `text[]`) em `card_features` com default vazio (sem criar arquivo de migration no repo).
- Atualizar tipos de `CardFeature` (backend) para incluir `tags?: string[]`.
- Atualizar `CardFeatureModel` para ler/escrever `tags` em `create`, `bulkCreate`, e `transformToResponse`.
- Success: API retorna `tags` quando existir, e aceita `tags` em criação/atualização.

2) **Atualizar tipos e consumo no frontend**

- Adicionar `tags?: string[]` em [`frontend/types/cardfeature.ts`](frontend/types/cardfeature.ts).
- Garantir que `ProjectDetail.tsx` use `cardFeature.tags` quando disponível.
- Success: nenhum erro de tipo e dados prontos para render no sumário.

3) **Botão “Sumário” + Modal**

- Adicionar botão “ícone + Sumário” alinhado à direita acima do primeiro card (no topo da lista).
- Criar modal com layout de duas colunas:
- Esquerda: lista de categorias únicas (ordenadas, com contagem opcional).
- Direita: lista de nomes de cards filtrada pela categoria selecionada (um por linha).
- Comportamento padrão: ao abrir, primeira categoria selecionada automaticamente.
- Success: modal abre, navega entre categorias e lista os cards corretamente.

4) **Fallback sem categorias**

- Quando `tags` estiver vazio/ausente, mostrar seção “Sem categoria”.
- Success: nenhum modal vazio; sempre há um grupo exibido.

5) **Verificação visual**

- Desktop e mobile: modal legível e botão posicionado como pedido.
- Success: usuário aprova layout e fluxo do sumário.

## Notas de implementação

- Tipo recomendado para `tags`: `text[]` no Postgres (mais simples).
- Sem UI de edição agora; categorias podem ser populadas por seed/admin/rotas existentes mais tarde.