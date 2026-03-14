---
name: flow_screen_type
overview: Adicionar um novo tipo de bloco "flow" nos cards CODIGOS, gerado automaticamente por IA a partir dos outros blocos do card, visualizando o fluxo de informação entre camadas. Uma nova aba "Flow" será criada como primeira no card para exibir o diagrama.
todos:
  - id: investigar_screens
    content: Investigar estrutura interna do JSONB screens para confirmar formato por screen
    status: completed
  - id: supabase_migration
    content: Migration no Supabase — adicionar 'flow' no CHECK constraint de content_type
    status: completed
  - id: types_enum
    content: Adicionar ContentType.FLOW = 'flow' nos enums de frontend e backend
    status: completed
  - id: backend_endpoint_generate
    content: Endpoint POST /api/card-features/:id/flow/generate que lê blocos e chama IA
    status: completed
  - id: frontend_renderer
    content: Componente FlowBlock que renderiza contents como diagrama vertical
    status: completed
  - id: frontend_botao
    content: Botão "Gerar Flow" — cria aba Flow como primeira no card
    status: completed
  - id: frontend_editor
    content: Editor de contents no modo de edição (adicionar, remover, reordenar, editar)
    status: completed
isProject: false
---

# Flow Block Type

## Visão geral

Um card CODIGOS tem `screens[]` → cada screen tem `blocks[]` → cada block tem um `type` (ContentType). O `flow` é mais um tipo de block — seguindo exatamente a mesma estrutura existente. A IA lê os blocos de código do card, entende as conexões entre os arquivos/funções referenciados, e gera um bloco de fluxo estruturado.

**Caso de uso:** time quer entender como uma funcionalidade funciona internamente. O dev monta o card com os blocos de código, clica em "Gerar Flow", e a IA produz o diagrama. Será criada uma **nova aba** (screen) como **primeira** no card, dedicada a exibir esse Flow.

---

## Estrutura real confirmada (passo 0 concluído)

```
card_features
  ├── content_type: ContentType        ← campo no banco, CHECK constraint no Supabase
  └── screens: CardFeatureScreen[]     ← JSONB
        └── screen
              ├── name: string
              ├── description: string
              ├── route?: string
              └── blocks: ContentBlock[]
                    ├── id: string
                    ├── type: ContentType   ← 'code' | 'text' | 'terminal' | ... | 'flow'
                    ├── content: string     ← para flow: JSON.stringify(contents[])
                    ├── language?: string
                    ├── title?: string
                    ├── route?: string
                    └── order: number
```

O conteúdo do bloco `flow` fica serializado em `content` como JSON string do array de items.

---

## Estrutura de dados do bloco flow

Um `ContentBlock` com `type: 'flow'` dentro de `blocks[]`:

```json
{
  "id": "uuid",
  "type": "flow",
  "title": "Fluxo de Sincronização",
  "order": 2,
  "content": "[{\"label\":\"handleSync()\",\"layer\":\"frontend\",\"file\":\"frontend/pages/ProjectDetail.tsx\",\"line\":\"491-509\",\"description\":\"Valida e dispara a requisição\"},{\"label\":\"POST /api/projects/{id}/github/sync\",\"layer\":\"api\",\"description\":\"Endpoint autenticado\"},{\"label\":\"GithubService.syncFromGithub()\",\"layer\":\"backend\",\"file\":\"backend/src/services/githubService.ts\",\"line\":\"879-961\",\"description\":\"Compara SHAs e atualiza cards mapeados\"}]"
}
```

Tipo auxiliar para os items dentro de `content`:

```typescript
interface FlowItem {
  label: string        // nome da função/endpoint/componente
  layer: FlowLayer     // camada do sistema
  file?: string        // caminho do arquivo
  line?: string        // linha(s)
  description: string  // uma linha explicando o que acontece
}

type FlowLayer = 'frontend' | 'api' | 'backend' | 'database' | 'service'
```

**Layers e cores:**


| layer      | cor     | uso                            |
| ---------- | ------- | ------------------------------ |
| `frontend` | azul    | componentes, hooks, pages      |
| `api`      | roxo    | endpoints REST, rotas          |
| `backend`  | verde   | controllers, services          |
| `database` | laranja | models, queries                |
| `service`  | cinza   | serviços externos, integrações |


---

## Passos de implementação

### 1. Supabase — Migration

O campo `content_type` na tabela `card_features` tem um CHECK constraint que precisa incluir `'flow'`:

```sql
ALTER TABLE card_features
  DROP CONSTRAINT IF EXISTS card_features_content_type_check;

ALTER TABLE card_features
  ADD CONSTRAINT card_features_content_type_check
  CHECK (content_type IN ('code', 'text', 'terminal', 'youtube', 'pdf', 'newsletter', 'flow'));
```

Executar via painel SQL do Supabase ou via migration versionada.

---

### 2. Types — Enum ContentType

Adicionar `FLOW = 'flow'` em dois lugares:

- `frontend/types/cardfeature.ts` → enum `ContentType`
- `backend/src/types/cardfeature.ts` → enum `ContentType`

Também adicionar a interface `FlowItem` e o tipo `FlowLayer` em ambos os arquivos de tipos.

---

### 3. Backend — Endpoint de geração

```
POST /api/card-features/:id/flow/generate
Auth: obrigatória
```

**Lógica:**

1. Busca o card pelo `id` e verifica acesso do usuário
2. Extrai todos os blocos de tipo `code`, `text` e `terminal` de todas as screens
3. Para cada bloco: usa `content` (código inline) + `route` (referência de arquivo) como contexto
4. Monta prompt para Grok com os conteúdos
5. Retorna `{ contents: FlowItem[] }` — o frontend cria nova aba e salva o bloco

**Prompt para a IA:**

```
Você é um especialista em arquitetura de software. Analise os trechos de código abaixo
e gere um fluxo de informação estruturado mostrando como os dados fluem entre as camadas.

Para cada item retorne:
- label: nome da função/endpoint/componente
- layer: frontend | api | backend | database | service
- file: caminho do arquivo (se identificável)
- line: linha(s) (se identificável)
- description: uma linha explicando o que acontece

Retorne apenas JSON válido no formato { "contents": [...] }.

Código para análise:
[blocos do card]
```

**Modelo:** `grok-4-1-fast-reasoning` (via `llmClient.ts` já configurado — GROK_API_KEY + endpoint x.ai)

**Arquivo:** `backend/src/controllers/CardFeatureController.ts` + rota em `backend/src/routes/cardFeatureRoutes.ts`

---

### 4. Frontend — Componente FlowBlock

Renderiza o JSON deserializado de `content` como diagrama vertical com nós conectados:

```
┌──────────────────────────────────┐
│  🔵  handleSync()                │
│      frontend/pages/...tsx:491   │
│      Valida e dispara a req.     │
└──────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│  🟣  POST /api/.../sync          │
│      Endpoint autenticado        │
└──────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│  🟢  syncFromGithub()            │
│      backend/src/services/...    │
│      Compara SHAs                │
└──────────────────────────────────┘
```

Arquivo novo: `frontend/components/FlowBlock.tsx`

Integrar no renderer de blocos do `CardFeature.tsx` (onde hoje faz switch/if por `block.type`).

---

### 5. Frontend — Botão "Gerar Flow"

- Aparece no card em **view mode** e **edit mode**
- Só aparece em cards `CODIGOS` com pelo menos um bloco `code` ou `terminal`
- Estado: idle → loading ("Analisando código...") → sucesso/erro
- Ao sucesso: **cria uma nova aba** (screen) como **primeira** no card, com o bloco `flow`, e salva
- Nome da aba: "Flow" (ou "Fluxo")
- Se já existe aba Flow na primeira posição: botão muda para "Regenerar Flow" e substitui o conteúdo

---

### 6. Frontend — Editor de items (edit mode)

No modo de edição, dentro do bloco `flow`, cada item pode ser:

- **Editado** inline (label, description, file, line, layer)
- **Removido**
- **Reordenado** (botões ↑↓)
- **Adicionado** manualmente (botão "+ Item")

Segue o padrão dos outros editores de bloco do card.

---

## O que muda vs o que não muda


|                                             | Muda?                             |
| ------------------------------------------- | --------------------------------- |
| Schema `screens` (JSONB)                    | ✅ Não — aceita qualquer estrutura |
| CHECK constraint `content_type` no Supabase | ⚠️ Sim — adicionar `'flow'`       |
| Enum `ContentType` (frontend + backend)     | ⚠️ Sim — adicionar `FLOW`         |
| `card_type`                                 | ✅ Não — continua `codigos`        |
| Fluxo de criação de card                    | ✅ Não — flow é gerado depois      |
| Outros tipos de bloco                       | ✅ Não — nenhum é afetado          |


