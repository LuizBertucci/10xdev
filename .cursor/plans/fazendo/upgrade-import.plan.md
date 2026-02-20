---
name: staged_import
overview: Staged import — visibilidade de arquivos, preview de cards antes de salvar, e re-import em projeto existente (repo evoluiu ou import parcial).
todos:
  - id: sql_migration
    content: Adicionar 3 campos em import_jobs (mode, proposed_cards_json, file_report_json) + step awaiting_review
    status: pending
  - id: file_filters_classify
    content: Adicionar classifyFile() em fileFilters.ts com retorno tipado de motivo de exclusão
    status: pending
  - id: github_service_on_skipped
    content: Adicionar callback onSkipped ao listRepoFiles() para capturar arquivos rejeitados
    status: pending
  - id: import_job_model
    content: Atualizar ImportJobModel com 3 campos novos, step awaiting_review e método getById()
    status: pending
  - id: project_types
    content: Adicionar ReimportFromGithubRequest e ConfirmImportRequest em types/project.ts
    status: pending
  - id: ai_service_already_mapped
    content: Adicionar parâmetro alreadyMappedPaths ao generateCardGroupsFromRepo para anotar cards com _alreadyMapped
    status: pending
  - id: controller_modify_import
    content: Modificar importFromGithub para suportar mode='staged' (staged não chama onCardReady, salva proposed_cards_json)
    status: pending
  - id: controller_reimport
    content: Novo handler reimportFromGithub (POST /:id/import-from-github) — extrai alreadyMappedPaths, cria job staged
    status: pending
  - id: controller_confirm
    content: Novo handler confirmImport (POST /:id/import/confirm) — cria cards selecionados do proposed_cards_json
    status: pending
  - id: controller_reject
    content: Novo handler rejectImport (POST /:id/import/reject) — limpa proposed_cards_json
    status: pending
  - id: project_routes
    content: Registrar 3 novas rotas em projectRoutes.ts
    status: pending
  - id: frontend_types
    content: Atualizar importJobUtils.ts com tipos FileReport, ProposedCard e step awaiting_review
    status: pending
  - id: frontend_service
    content: Adicionar reimportFromGithub, confirmImport, rejectImport em projectService.ts
    status: pending
  - id: import_review_modal
    content: Criar ImportReviewModal.tsx com 3 tabs (Cards / Incluídos / Ignorados) e seleção por checkbox
    status: pending
  - id: import_progress_widget
    content: Atualizar ImportProgressWidget para tratar awaiting_review (botão Revisar, sem auto-fechar)
    status: pending
  - id: project_detail_integration
    content: Integrar ImportReviewModal no ProjectDetail + botão Atualizar do GitHub + handlers confirm/reject
    status: pending
isProject: false
---

# Staged Import: Visibilidade + Preview + Re-import

## Contexto

O fluxo atual de importação de repositórios cria cards imediatamente, sem revisão. Não há como ver quais arquivos foram processados/ignorados, e toda nova importação cria um projeto novo. A solução é um modelo "staged": a IA propõe cards → usuário revisa → confirma o que salvar.

**Cenários principais:**

- Repo evoluiu → adicionar cards novos sem duplicar os existentes
- Import falhou parcialmente → completar sem perder o que já existe
- Controle total → ver o que a IA propõe antes de comprometer

---

## 1. Schema: 3 campos em `import_jobs` + 1 step

```sql
ALTER TABLE import_jobs
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'direct'
    CHECK (mode IN ('direct', 'staged')),
  ADD COLUMN IF NOT EXISTS proposed_cards_json JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_report_json    JSONB DEFAULT NULL;
```

- `mode = 'direct'`: comportamento atual (retrocompatível)
- `mode = 'staged'`: IA propõe, não salva; espera confirmação do usuário
- `proposed_cards_json`: array de cards propostos (limpo após confirm/reject)
- `file_report_json`: `{ included: string[], ignored: { path, reason }[] }`

**Step novo no union `ImportJobStep`:** `'awaiting_review'`

---

## 2. Backend

### `backend/src/utils/fileFilters.ts`

Adicionar sem alterar `shouldIncludeFile`:

```typescript
export type FileExclusionReason = 'ignored_dir' | 'ignored_file' | 'invalid_extension'
export type FileClassification = { included: true } | { included: false; reason: FileExclusionReason }

export function classifyFile(filePath: string): FileClassification
// mesma lógica de shouldIncludeFile mas retorna o motivo
```

### `backend/src/services/githubService.ts`

Adicionar parâmetro `onSkipped` ao `listRepoFiles()`:

```typescript
static async listRepoFiles(
  owner, repo, branch, token?,
  opts?: { onSkipped?: (path: string, reason: FileExclusionReason) => void }
): Promise<FileEntry[]>
```

No loop de filtro (já temos `tree` completo antes de filtrar), chamar `opts.onSkipped()` para itens descartados.

### `backend/src/models/ImportJobModel.ts`

- Adicionar `mode`, `proposed_cards_json`, `file_report_json` aos interfaces `Row`, `Insert`, `Update`
- Adicionar `'awaiting_review'` ao union `ImportJobStep`
- Novo método: `static async getById(id: string): Promise<ImportJobRow | null>`

### `backend/src/types/project.ts`

```typescript
export interface ReimportFromGithubRequest {
  url: string; token?: string; installationId?: number; branch?: string
}
export interface ConfirmImportRequest {
  jobId: string; cardIndices?: number[]  // ausente = confirmar todos
}
```

### `backend/src/services/aiCardGroupingService.ts`

Adicionar ao `generateCardGroupsFromRepo`:

```typescript
options?: {
  onProgress?: ...
  onCardReady?: ...
  alreadyMappedPaths?: string[]  // NOVO: paths já cobertos por cards existentes
}
```

Após IA retornar, cruzar `screens[].blocks[].route` contra o Set. Anotar card com `_alreadyMapped: boolean` (sem alterar o prompt da IA — dedup é feito no caller).

### `backend/src/controllers/ProjectController.ts`

**Modificar `importFromGithub`** — aceitar `mode?: 'direct' | 'staged'` no body:

- `mode === 'staged'`: não usa `onCardReady`, coleta todos os cards, salva em `proposed_cards_json`, step → `awaiting_review`
- Usar `onSkipped` para construir `file_report_json` durante `listRepoFiles`
- `mode === 'direct'` (default): comportamento atual, zero mudanças

**3 handlers novos:**

```typescript
// POST /api/projects/:id/import-from-github — re-importa no projeto existente
static reimportFromGithub = safeHandler(async (req, res) => {
  // 1. findById(id) → verifica permissão
  // 2. hasRunningForProject(id) → 409 se já rodando
  // 3. Extrai alreadyMappedPaths dos code blocks do projeto
  // 4. Cria job mode='staged', responde 202
  // 5. Background: igual importFromGithub staged + alreadyMappedPaths
})

// POST /api/projects/:id/import/confirm
static confirmImport = safeHandler(async (req, res) => {
  // 1. getById(jobId) → valida projeto e step=awaiting_review
  // 2. Filtra cardIndices se fornecido
  // 3. CardFeatureModel.bulkCreate + ProjectModel.addCardsBulk
  // 4. proposed_cards_json → null, atualiza cards_created
})

// POST /api/projects/:id/import/reject
static rejectImport = safeHandler(async (req, res) => {
  // 1. getById(jobId) → valida
  // 2. proposed_cards_json → null
})
```

**Lógica `alreadyMappedPaths` para re-import:**

```typescript
// Query: project_cards → card_features(screens)
// Percorrer screens[].blocks[] onde type='code' && block.route
// Resulta em Set<string> de paths já cobertos no projeto
```

### `backend/src/routes/projectRoutes.ts`

```typescript
// Antes das rotas /:id genéricas:
router.post('/:id/import-from-github', ProjectController.reimportFromGithub)
router.post('/:id/import/confirm',     ProjectController.confirmImport)
router.post('/:id/import/reject',      ProjectController.rejectImport)
```

---

## 3. Frontend

### `frontend/lib/importJobUtils.ts`

Adicionar ao `ImportJob`:

```typescript
mode: 'direct' | 'staged'
proposed_cards_json: ProposedCard[] | null
file_report_json: FileReport | null
```

Novos tipos:

```typescript
export interface FileReport {
  included: string[]
  ignored: { path: string; reason: string }[]
}
export interface ProposedCard {
  title: string; category?: string; description: string; tech?: string
  screens: Array<{ name: string; description: string; blocks: Array<{ route?: string; type: string }> }>
  _alreadyMapped?: boolean
}
```

Adicionar ao `defaultMessage`: `awaiting_review: 'Cards propostos aguardando revisão'`

### `frontend/services/projectService.ts`

```typescript
reimportFromGithub(projectId, data: { url, token?, installationId?, branch? })
confirmImport(projectId, data: { jobId, cardIndices? })
rejectImport(projectId, data: { jobId })
```

### Novo: `frontend/components/ImportReviewModal.tsx`

Modal com 3 tabs: **Cards Propostos** | **Arquivos Incluídos** | **Arquivos Ignorados**

```
┌──────────────────────────────────────────────────────────┐
│  Revisão do Import — 12 cards propostos                  │
├──────────────────────────────────────────────────────────┤
│  [Cards (12)]  [Incluídos (47)]  [Ignorados (123)]       │
├──────────────────────────────────────────────────────────┤
│  ☑ Sistema de Autenticação      ⚠ Substitui existente    │
│    src/auth/, frontend/pages/Login.tsx                   │
│  ☑ API de Projetos              ✨ novo                   │
│    backend/controllers/...                               │
├──────────────────────────────────────────────────────────┤
│  [Rejeitar tudo]               [Confirmar (10/12) →]     │
└──────────────────────────────────────────────────────────┘
```

Props:

```typescript
interface ImportReviewModalProps {
  open: boolean; jobId: string; projectId: string
  proposedCards: ProposedCard[]; fileReport: FileReport
  onConfirm: (selectedIndices: number[]) => Promise<void>
  onReject: () => Promise<void>; onClose: () => void
}
```

### `frontend/components/ImportProgressWidget.tsx`

Quando `job.step === 'awaiting_review'`:

- Mostrar "Aguardando revisão" + botão "Revisar"
- **Não** auto-fechar após 5s (remover timeout para este step)
- "Revisar" navega para `/projects/{projectId}?reviewJobId={jobId}`

### `frontend/pages/ProjectDetail.tsx`

1. Detectar `?reviewJobId=` nos searchParams → buscar job → abrir `ImportReviewModal`
2. Handler `handleConfirmImport(selectedIndices)` → `confirmImport` → reload cards → toast
3. Handler `handleRejectImport()` → `rejectImport` → toast
4. **Botão "Atualizar do GitHub"** na aba de configurações: visível quando `project.repositoryUrl` existe; desabilitado se import em andamento

---

## 4. Fluxo end-to-end

**Primeiro import (staged):**

```
POST /import-from-github { mode: 'staged' }
→ 202 → background analisa → proposed_cards_json preenchido
→ realtime: step=awaiting_review
→ widget mostra "Revisar" → modal abre
→ usuário seleciona → confirm → cards criados
```

**Re-import em projeto existente:**

```
Botão "Atualizar do GitHub" → POST /projects/:id/import-from-github
→ extrai alreadyMappedPaths dos code blocks → job staged
→ modal: cards com _alreadyMapped mostram badge "⚠ Substitui existente"
→ usuário escolhe só os novos → confirm com subset
```

**Retrocompatibilidade:**

```
mode: 'direct' (default) → fluxo atual sem mudanças
```

---

## 5. Arquivos críticos


| Arquivo                                         | Mudança                              |
| ----------------------------------------------- | ------------------------------------ |
| Supabase migration                              | + 3 colunas em `import_jobs`         |
| `backend/src/utils/fileFilters.ts`              | + `classifyFile()`                   |
| `backend/src/services/githubService.ts`         | + `onSkipped` callback               |
| `backend/src/models/ImportJobModel.ts`          | + 3 campos, step, `getById()`        |
| `backend/src/types/project.ts`                  | + 2 interfaces de request            |
| `backend/src/services/aiCardGroupingService.ts` | + `alreadyMappedPaths` param         |
| `backend/src/controllers/ProjectController.ts`  | mod `importFromGithub`, + 3 handlers |
| `backend/src/routes/projectRoutes.ts`           | + 3 rotas                            |
| `frontend/lib/importJobUtils.ts`                | + tipos novos                        |
| `frontend/services/projectService.ts`           | + 3 métodos                          |
| `frontend/components/ImportProgressWidget.tsx`  | tratar `awaiting_review`             |
| `frontend/pages/ProjectDetail.tsx`              | modal + botão re-import              |
| `frontend/components/ImportReviewModal.tsx`     | **novo componente**                  |


---

## 6. Verificação

```bash
# Verificar migração SQL
SELECT column_name FROM information_schema.columns
WHERE table_name = 'import_jobs'
AND column_name IN ('mode', 'proposed_cards_json', 'file_report_json');

# Builds sem erro
cd backend && npm run build
cd frontend && npm run build
```

**Testes manuais:**

1. Import `mode: 'staged'` → nenhum card criado antes de confirmar
2. Confirm com subset de indices → count correto de cards criados
3. Reject → `proposed_cards_json` volta a null
4. Re-import → cards com `_alreadyMapped: true` marcados no modal
5. `mode: 'direct'` → comportamento anterior inalterado

---

## Ordem de implementação sugerida

1. SQL migration
2. Backend: `fileFilters` → `githubService` → `ImportJobModel` → `types/project`
3. Backend: modificar `importFromGithub` para staged + file_report
4. Backend: `reimportFromGithub`, `confirmImport`, `rejectImport` + rotas
5. Frontend: tipos → service → `ImportProgressWidget` → `ImportReviewModal` → `ProjectDetail`

