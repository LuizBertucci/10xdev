# ESLint Cleanup — Habilitar regras desabilitadas

Auditoria feita em 2026-02-07. Todas as regras `"off"` foram reabilitadas temporariamente para mapear o debito tecnico.

**Total: 434 erros (254 frontend + 180 backend)**

---

## ~~Bloco 1 — `no-mixed-spaces-and-tabs` + triviais (96 erros)~~ CONCLUIDO

Todas as regras habilitadas. Lint e build passando em ambos os projetos.

Regras reabilitadas: `no-mixed-spaces-and-tabs`, `prefer-const`, `no-empty-object-type`, `no-require-imports`, `no-extra-semi`, `ban-types`.
Excecao: `no-namespace` mantido `"off"` no backend (necessario para declaration merging do Express).

---

## Bloco 2 — `no-unused-vars` (77 erros)

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

- [ ] Limpar imports/vars nao usados no frontend (arquivo por arquivo)
- [ ] Habilitar regra `"@typescript-eslint/no-unused-vars": "warn"` no frontend

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

- [ ] Limpar imports/vars nao usados no backend (arquivo por arquivo)
- [ ] Habilitar regra `"@typescript-eslint/no-unused-vars": "warn"` no backend

---

## Bloco 3 — `no-explicit-any` (262 erros)

O maior bloco. Resolver tudo de uma vez e inviavel. Estrategia gradual.

### 3.1 — Estrategia proposta

1. **Habilitar como `"warn"`** nos dois projetos (nao quebra o lint, mas aparece nos relatorios)
2. **Codigo novo nunca usa `any`** — regra para o Claude/devs
3. **Resolver por arquivo** em sessoes dedicadas, priorizando por impacto

### 3.2 — Backend (154 erros) — Maior concentracao

| Arquivo | Erros | Prioridade |
|---|---|---|
| `models/CardFeatureModel.ts` | ~45 | alta — core do sistema |
| `models/ProjectModel.ts` | ~30 | alta — core do sistema |
| `models/UserModel.ts` | ~15 | media |
| `services/aiCardGroupingService.ts` | ~15 | media |
| `services/githubService.ts` | ~8 | media |
| `middleware/controllerHelpers.ts` | 5 | baixa |
| `middleware/supabaseMiddleware.ts` | 5 | baixa |
| `middleware/errorHandler.ts` | 4 | baixa |
| `database/supabase.ts` | 3 | baixa |
| Outros | ~24 | baixa |

### 3.3 — Frontend (108 erros)

| Arquivo | Erros | Prioridade |
|---|---|---|
| `pages/ProjectDetail.tsx` | ~20 | alta |
| `services/apiClient.ts` | ~14 | alta — base de todos os services |
| `hooks/useCardFeatures.ts` | ~10 | media |
| `hooks/useApi.ts` | ~8 | media |
| `pages/Projects.tsx` | 4 | media |
| `pages/Contents.tsx` | 2 | baixa |
| `types/api.ts` | ~8 | media |
| `utils/macroCategories.ts` | 5 | baixa |
| Outros | ~37 | baixa |

### 3.4 — Tarefas

- [ ] Habilitar `"@typescript-eslint/no-explicit-any": "warn"` nos dois projetos
- [ ] Tipar `models/CardFeatureModel.ts` (backend)
- [ ] Tipar `models/ProjectModel.ts` (backend)
- [ ] Tipar `services/apiClient.ts` (frontend)
- [ ] Tipar `pages/ProjectDetail.tsx` (frontend)
- [ ] Continuar arquivo por arquivo conforme prioridade

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
