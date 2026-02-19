---
name: "Análise: Repensar Contents do Zero"
overview: Usar CardFeature unificado com tipos "codigos" e "post", adicionando campos opcionais para vídeos e posts.
todos:
  - id: analyze-differences
    content: Analisar diferenças conceituais entre CardFeature e Content
    status: completed
  - id: evaluate-option-a
    content: "Avaliar Opção A: Transformar CardFeature para ter modo 'post'"
    status: completed
  - id: evaluate-option-b
    content: "Avaliar Opção B: Contents do zero aproveitando elementos"
    status: completed
  - id: evaluate-option-c
    content: "Avaliar Opção C: Evoluir CardFeature → ContentFeature com tipos 'codigo' e 'post'"
    status: completed
  - id: evaluate-option-d
    content: "Avaliar Opção D: Adicionar 'post' ao CardType e renderizar diferente"
    status: completed
  - id: recommend-approach
    content: Recomendar abordagem e justificar decisão
    status: completed
isProject: false
---

# Decisão Final: CardFeature Unificado (CODIGOS | POST)

## Contexto e Decisão Final

**Decisão:** Usar CardFeature unificado com apenas tipos "codigo" e "post", adicionando campos opcionais para suportar diferentes formatos (vídeos, PDFs, etc.).

**Objetivo:**

- CardFeature com apenas `card_type: 'codigos' | 'post'`
- Adicionar campos opcionais como `youtube_url`, `thumbnail` para vídeos
- Adicionar campos como `category`, `file_url` para posts
- Unificar tudo em uma única entidade

**Separação de Visualização:**

- Página **Códigos** (`/codes`): mostra apenas `card_type === 'codigos'`
- Página **Conteúdo** (`/contents`): mostra apenas `card_type === 'post'`

## Estrutura Final Proposta

### CardFeature Unificado

```typescript
enum CardType {
  CODIGOS = 'codigos',  // Manter como está
  POST = 'post'         // NOVO
  // Remover: DICAS, WORKFLOWS
}

interface CardFeature {
  id: string
  title: string
  description: string
  card_type: CardType  // 'codigos' | 'post'
  
  // Campos específicos de código (quando card_type === 'codigos')
  tech?: string
  language?: string
  
  // Campos específicos de post
  category?: string
  file_url?: string  // PDF
  
  // Campos específicos de vídeo (quando card_type === 'post')
  youtube_url?: string
  video_id?: string
  thumbnail?: string
  
  // Campos comuns
  screens: ContentScreen[]  // Blocos (CODE, TEXT, TERMINAL)
  tags?: string[]
  visibility: Visibility
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  // ... outros campos existentes
}
```

## Implementação

### Backend

#### 1. Simplificar enum CardType

```typescript
// backend/src/types/cardfeature.ts
export enum CardType {
  CODIGOS = 'codigos',  // Manter como está
  POST = 'post'         // NOVO
  // Remover: DICAS, WORKFLOWS
}
```

#### 2. Adicionar campos opcionais

- Usar MCP do Supabase para aplicar migração diretamente no banco
- Executar via `mcp_supabase_apply_migration` com o seguinte SQL:

```sql
-- Migration: adicionar campos para posts e vídeos
ALTER TABLE card_features 
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS video_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS thumbnail TEXT;
```

- **Não criar arquivo SQL de migração**, aplicar diretamente via MCP

#### 3. Migração de dados

```sql
-- Manter 'codigos' como está (não precisa renomear)

-- Converter 'dicas' para 'codigos' (ou 'post' se fizer sentido)
UPDATE card_features SET card_type = 'codigos' WHERE card_type = 'dicas';

-- Converter 'workflows' para 'codigos' (ou 'post' se fizer sentido)
UPDATE card_features SET card_type = 'codigos' WHERE card_type = 'workflows';
```

#### 4. Atualizar validação no Model

- Permitir apenas `card_type = 'codigos' | 'post'`
- Campos opcionais baseados em `card_type`:
  - `codigos`: `tech`, `language` (opcionais mas recomendados)
  - `post`: `category`, `file_url`, `youtube_url`, `thumbnail` (opcionais)
- **Nota:** `video_id` não é necessário - pode ser extraído de `youtube_url` quando necessário

### Frontend

#### 1. Simplificar enum CardType

```typescript
// frontend/types/cardfeature.ts
export enum CardType {
  CODIGOS = 'codigos',  // Manter como está
  POST = 'post'         // NOVO
  // Remover: DICAS, WORKFLOWS
}
```

#### 2. Atualizar CardFeatureForm

- Select de `card_type` com apenas 'Codigo' e 'Post'
- Quando `card_type === 'codigo'`: mostrar `tech`, `language`
- Quando `card_type === 'post'`: mostrar `category`, `fileUrl`, `youtubeUrl` (opcional)
- Sempre mostrar `screens` (blocos) para ambos os tipos

#### 3. Atualizar Codes.tsx

- **Filtrar apenas `card_type === 'codigo'**` (usar novo nome)
- Remover filtros de 'dicas' e 'workflows'
- Manter cards compactos para códigos
- Posts não aparecem mais aqui

#### 4. Atualizar Contents.tsx

- **Filtrar apenas `card_type === 'post'**` (usar CardFeature)
- Renderizar `CardPost` para posts
- Usar `cardFeatureService` ao invés de `contentService`
- Suportar vídeos via campos `youtube_url` em CardFeature
- Remover dependência de Content (tudo vira CardFeature)

#### 5. Adaptar CardPost (renomeado de PostsDenseList)

- Receber `CardFeature[]` filtrados por `card_type === 'post'`
- Exibir lista densa com metadados (tags, category, fileUrl, youtubeUrl)
- Adaptar de `Content[]` para `CardFeature[]`

#### 6. Atualizar ContentDetail

- Para posts: usar CardFeature com `card_type === 'post'`
- Para vídeos: usar CardFeature com `youtube_url` preenchido
- Renderizar blocos usando `ContentRenderer`
- Manter compatibilidade com URLs antigas

## Arquivos a Modificar

### Backend (~4-5 arquivos)

- `backend/src/types/cardfeature.ts` - Simplificar enum para `CODIGOS | POST`
- `backend/src/models/CardFeatureModel.ts` - Validação e suporte a novos campos
- `backend/migrations/XXX_simplify_card_type_to_codigos_post.sql` - Simplificar enum
- `backend/migrations/XXX_add_fields_for_posts_videos.sql` - Adicionar campos opcionais
- `backend/migrations/XXX_migrate_existing_card_types.sql` - Migrar dados existentes

### Frontend (~8-10 arquivos)

- `frontend/types/cardfeature.ts` - Simplificar enum para `CODIGO | POST`
- `frontend/components/CardFeatureForm.tsx` - Suporte a post e campos opcionais
- `frontend/pages/Codes.tsx` - **Filtrar apenas `card_type === 'codigos'**` (manter como está)
- `frontend/pages/Contents.tsx` - **Filtrar apenas `card_type === 'post'**` (usar CardFeature)
- `frontend/components/CardPost.tsx` - Adaptar para receber `CardFeature[]` (renomeado de PostsDenseList)
- `frontend/hooks/useCardFeatures.ts` - Suporte a filtro 'post' e 'codigos'
- `frontend/pages/ContentDetail.tsx` - Adaptar para CardFeature (posts e vídeos)
- `frontend/services/cardFeatureService.ts` - Suporte a novos campos
- Remover/adaptar `frontend/services/contentService.ts` (se não for mais usado)

**Total: ~12-15 arquivos modificados**

## Separação de Visualização

### Página Códigos (`/codes`)

- Mostra apenas `card_type === 'codigos'` (manter como está)
- Cards compactos com preview de código
- Filtros: tech, language
- **Posts não aparecem aqui**

### Página Conteúdo (`/contents`)

- Mostra apenas `card_type === 'post'` (CardFeature)
- Lista densa com metadados (CardPost)
- Suporta vídeos via `youtube_url` em CardFeature
- Filtros: category, tags, ordenação
- **Códigos não aparecem aqui**
- **Tudo é CardFeature agora** (posts e vídeos)

### Benefícios

- ✅ Separação clara de propósito
- ✅ UX otimizada para cada tipo
- ✅ Filtros específicos por página
- ✅ Usuário sabe onde encontrar cada coisa
- ✅ Cada página tem seu próprio contexto e visualização
- ✅ Unificação completa em CardFeature

## Migração de Dados

### Dados Atuais (verificado via Supabase)

- 194 cards tipo "codigos" → converter para "codigo"
- 4 cards tipo "dicas" → converter para "codigos" ou "post"
- 5 cards tipo "workflows" → converter para "codigos" ou "post"
- Total: 203 cards existentes

### Estratégia de Migração

1. **Renomear 'codigos' → 'codigo'**
  - 194 cards afetados
  - Migração simples (UPDATE)
2. **Converter 'dicas' e 'workflows'**
  - 9 cards afetados
  - Decisão: converter todos para 'codigo' (ou analisar caso a caso)
3. **Adicionar campos opcionais**
  - Campos novos são opcionais
  - Não afeta dados existentes

## Conclusão

### Decisão Final: CardFeature Unificado (CODIGOS | POST)

**Estrutura:**

- `card_type: 'codigos' | 'post'` (apenas 2 tipos)
- Campos opcionais: `category`, `file_url`, `youtube_url`, `video_id`, `thumbnail`
- Estrutura de blocos (screens) para todos os tipos
- Separação de visualização por página

**Implementação:**

- ~12-15 arquivos modificados
- Migração de dados necessária (203 cards)
- Validação baseada em `card_type`
- Renderização condicional por tipo

**Benefícios:**

- ✅ Unificação completa (códigos, posts, vídeos)
- ✅ Simplificação (apenas 2 tipos)
- ✅ Reutiliza toda estrutura existente
- ✅ Suporta vídeos via campos opcionais
- ✅ Resolve o problema de forma elegante

