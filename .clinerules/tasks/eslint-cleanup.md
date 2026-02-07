# ESLint Cleanup — Habilitar regras desabilitadas

Auditoria feita em 2026-02-07. Todas as regras `"off"` foram reabilitadas temporariamente para mapear o debito tecnico.

**Total: 434 erros (254 frontend + 180 backend)**

---

## ~~Bloco 1 — `no-mixed-spaces-and-tabs` + triviais (96 erros)~~ CONCLUIDO

Todas as regras habilitadas. Lint e build passando em ambos os projetos.

Regras reabilitadas: `no-mixed-spaces-and-tabs`, `prefer-const`, `no-empty-object-type`, `no-require-imports`, `no-extra-semi`, `ban-types`.
Excecao: `no-namespace` mantido `"off"` no backend (necessario para declaration merging do Express).

---

## ~~Bloco 2 — `no-unused-vars` (77 erros)~~ ✅ CONCLUIDO

Limpeza de imports e variaveis que sobraram de refactors. Medio esforco, zero risco funcional.

### 2.1 — Frontend (58 erros)

Arquivos mais afetados:

| Arquivo | Erros | Tipo |
|---|---|---|
| `components/CardFeature/CardFeatureForm.tsx` | ~10 | imports nao usados |
| `components/CardFeature/CardFeatureModal.tsx` | ~5 | imports nao usados |
| `pages/ProjectDetail.tsx` | ~5 | imports + vars nao usados |
| `pages/Contents.tsx` | ~3 | vars nao usados |
| `pages/Home.tsx` | 3 | imports nao usados (CardDescription, CardHeader, CardTitle) |
| `hooks/useCardFeatures.ts` | ~5 | vars nao usados |
| `services/userService.ts` | 1 | UserSearchParams nao usado |
| `utils/projectCategories.ts` | 1 | normalizeTag nao usada |
| Outros | ~25 | espalhados |

- [x] Limpar imports/vars nao usados no frontend (arquivo por arquivo)
- [x] Habilitar regra `"@typescript-eslint/no-unused-vars": "warn"` no frontend

### 2.2 — Backend (19 erros)

| Arquivo | Erros | Tipo |
|---|---|---|
| `models/CardFeatureModel.ts` | 3 | supabase import, CardFeatureRow, dataError/countError |
| `models/ProjectModel.ts` | 1 | supabase import |
| `services/aiCardGroupingService.ts` | 3 | imports nao usados + llmContent |
| `services/cardQualitySupervisor.ts` | 1 | CardFeatureScreen import |
| `services/githubService.ts` | 2 | `_` em destructuring |
| `middleware/cors.ts` | 1 | Request import |
| `middleware/errorHandler.ts` | 1 | next param |
| `scripts/migrate-to-category-based-grouping.ts` | 1 | normalizeTags |
| `types/cardfeature.ts` | 2 | imports nao usados |

- [x] Limpar imports/vars nao usados no backend (arquivo por arquivo)
- [x] Habilitar regra `"@typescript-eslint/no-unused-vars": "warn"` no backend

**Commit**: `3aa647a` — "chore: cleanup de unused-vars e habilitar regras ESLint"

---

## Bloco 3 — `no-explicit-any` (186 erros) 🔄 EM ANDAMENTO

O maior bloco. Estrategia: um arquivo por vez, erro por erro.

### 3.1 — Estrategia atual

1. **Habilitar como `"error"`** nos dois projetos (decisao do usuario: corrigir agora)
2. **Codigo novo nunca usa `any`** — regra para o Claude/devs
3. **Resolver por arquivo** em sessoes dedicadas, priorizando por impacto

### 3.2 — Backend (60 erros) — Maior concentracao

| Arquivo | Erros | Prioridade | Status |
|---|---|---|---|
| `models/CardFeatureModel.ts` | ~45 | alta — core do sistema | ✅ CONCLUIDO (45/45 corrigidos) |
| `models/ProjectModel.ts` | ~30 | alta — core do sistema | ✅ CONCLUIDO (13/13 corrigidos) |
| `models/UserModel.ts` | ~15 | media | ✅ CONCLUIDO (6/6 corrigidos) |
| `services/aiCardGroupingService.ts` | ~15 | media | ✅ CONCLUIDO (13/13 corrigidos) |
| `services/githubService.ts` | ~8 | media | ✅ CONCLUIDO (5/5 corrigidos) |
| `middleware/controllerHelpers.ts` | 5 | baixa | ✅ CONCLUIDO (4/4 corrigidos) |
| `middleware/supabaseMiddleware.ts` | 5 | baixa | ✅ CONCLUIDO (4/4 corrigidos) |
| `middleware/errorHandler.ts` | 4 | baixa | ✅ CONCLUIDO (4/4 corrigidos) |
| `database/supabase.ts` | 3 | baixa | 🔄 EM ANDAMENTO |
| `models/UserModel.ts` | ~15 | media | ⏳ PENDENTE |
| `services/aiCardGroupingService.ts` | ~15 | media | ⏳ PENDENTE |
| `services/githubService.ts` | ~8 | media | ⏳ PENDENTE |
| `middleware/controllerHelpers.ts` | 5 | baixa | ⏳ PENDENTE |
| `middleware/supabaseMiddleware.ts` | 5 | baixa | ⏳ PENDENTE |
| `middleware/errorHandler.ts` | 4 | baixa | ⏳ PENDENTE |
| `database/supabase.ts` | 3 | baixa | ⏳ PENDENTE |
| Outros | ~24 | baixa | ⏳ PENDENTE |

### 3.3 — Frontend (108 erros)

| Arquivo | Erros | Prioridade | Status |
|---|---|---|---|
| `pages/ProjectDetail.tsx` | ~20 | alta | ⏳ PENDENTE |
| `services/apiClient.ts` | ~14 | alta — base de todos os services | ⏳ PENDENTE |
| `hooks/useCardFeatures.ts` | ~10 | media | ⏳ PENDENTE |
| `hooks/useApi.ts` | ~8 | media | ⏳ PENDENTE |
| `pages/Projects.tsx` | 4 | media | ⏳ PENDENTE |
| `pages/Contents.tsx` | 2 | baixa | ⏳ PENDENTE |
| `types/api.ts` | ~8 | media | ⏳ PENDENTE |
| `utils/macroCategories.ts` | 5 | baixa | ⏳ PENDENTE |
| Outros | ~37 | baixa | ⏳ PENDENTE |

### 3.4 — Padrões de erro mais comuns

1. **`catch (error: any)`** → `catch (error: unknown)` + `error instanceof Error ? error.message : ...`
2. **`(params as any).campo`** → usar o tipo correto em vez de casting
3. **`(row: any)` em transformToResponse** → `row: CardFeatureRow` ou tipo apropriado
4. **`map((u: any) => ...)`** → definir tipo: `map((u: { id: string }) => ...)`

### 3.5 — Tarefas

- [x] Habilitar `"@typescript-eslint/no-explicit-any": "error"` nos dois projetos
- [x] Tipar `models/CardFeatureModel.ts` (backend) — ✅ **CONCLUIDO (45/45 corrigidos)**
- [x] Tipar `models/ProjectModel.ts` (backend) — ✅ **CONCLUIDO (13/13 corrigidos)**
- [x] Tipar `models/UserModel.ts` (backend) — ✅ **CONCLUIDO (6/6 corrigidos)**
- [x] Tipar `services/aiCardGroupingService.ts` (backend) — ✅ **CONCLUIDO (13/13 corrigidos)**
- [x] Tipar `services/githubService.ts` (backend) — ✅ **CONCLUIDO (5/5 corrigidos)**
- [x] Tipar `middleware/controllerHelpers.ts` (backend) — ✅ **CONCLUIDO (4/4 corrigidos)**
- [x] Tipar `middleware/supabaseMiddleware.ts` (backend) — ✅ **CONCLUIDO (4/4 corrigidos)**
- [x] Tipar `middleware/errorHandler.ts` (backend) — ✅ **CONCLUIDO (4/4 corrigidos)**
- [ ] Tipar `database/supabase.ts` (backend)
- [ ] Tipar `models/UserModel.ts` (backend)
- [ ] Tipar `services/aiCardGroupingService.ts` (backend)
- [ ] Tipar `services/githubService.ts` (backend)
- [ ] Tipar arquivos restantes do backend por prioridade
- [ ] Tipar arquivos do frontend por prioridade

---

## Resumo de mudancas no ESLint apos cleanup

### Frontend `.eslintrc.cjs` — config alvo

```javascript
rules: {
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": "warn",
  // todas as outras regras: habilitadas (default do recommended)
}
```

### Backend `.eslintrc.cjs` — config alvo

```javascript
rules: {
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": "warn",
  // todas as outras regras: habilitadas (default do recommended)
}
```

---

## Ordem de execucao

1. **Bloco 1** — triviais (~96 erros, ~30min)
2. **Bloco 2** — unused vars (~77 erros, ~1h)
3. **Bloco 3** — any types (gradual, por sessao)
