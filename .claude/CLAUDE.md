# CLAUDE.md

## Projeto

**10xDev** — plataforma full-stack para gerenciar snippets e recursos tecnicos.

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui (Radix) — `frontend/`
- **Backend**: Node.js, Express, TypeScript, Supabase (PostgreSQL) — `backend/`
- **Padrao backend**: Controller → Model → Database

## Comandos

### Frontend (`frontend/`)
```bash
npm run dev       # Dev server (porta 3000)
npm run build     # Build de producao
npm run lint      # ESLint
```

### Backend (`backend/`)
```bash
npm run dev       # Dev server com nodemon (porta 3001)
npm run build     # Compila TypeScript para dist/
npm test          # Jest
npm run lint      # ESLint
npm run lint:fix  # ESLint com auto-fix
```

## Regras de codigo

### TypeScript — escreva codigo que compila sem erros

**Backend e mais estrito que o frontend.** No backend, respeite:
- `noImplicitAny` — nunca deixe tipos implicitos como `any`
- `noImplicitReturns` — toda funcao deve ter return explicito em todos os caminhos
- `noUncheckedIndexedAccess` — acesso por index retorna `T | undefined`, trate antes de usar
- `exactOptionalPropertyTypes` — propriedades opcionais nao aceitam `undefined` explicito, use omissao
- `noFallthroughCasesInSwitch` — todo `case` precisa de `break` ou `return`

**Frontend** usa `strict: true` mas sem as regras extras acima.

### ESLint — regras permissivas, mas nao ignore

Ambos os projetos desabilitam `no-explicit-any`, `no-unused-vars` e `prefer-const`. Mesmo assim:
- Nao crie variaveis sem uso desnecessariamente
- Prefira `const` sobre `let` quando o valor nao muda
- Use `any` somente quando realmente necessario — prefira tipos concretos

### Path aliases

- **Frontend**: `@/*` → `./*`
- **Backend**: `@/*` → `./src/*` (tambem `@/models/*`, `@/controllers/*`, `@/routes/*`, `@/middleware/*`, `@/database/*`, `@/utils/*`, `@/types/*`)

### Naming

- **Componentes/tipos**: PascalCase (`CardFeature.tsx`, `CardFeature`)
- **Utilitarios/hooks**: camelCase (`useCardFeatures.ts`)
- **Banco**: snake_case (`card_features`)
- **API**: kebab-case (`/card-features`)
- **Propriedades de tipo**: camelCase

## Idioma

- Converse sempre em **portugues**
- Commits, PRs e mensagens em **portugues** (ver skills `/commit` e `/pr`)

## Arquivos-chave

- `frontend/types/cardfeature.ts` — sistema de tipos compartilhado
- `backend/src/controllers/CardFeatureController.ts` — logica principal da API
- `frontend/components/CardFeature.tsx` — componente de exibicao
- `frontend/hooks/useCardFeatures.ts` — state management
- `backend/src/database/supabase.ts` — configuracao do banco
