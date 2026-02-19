---
name: migrar platform state
overview: Remover completamente o usePlatform/PlatformState, migrando toda navegacao para rotas nativas do Next.js App Router com segmentos reais (/codes, /contents, /projects, /admin) e um layout compartilhado com sidebar.
todos:
  - id: t1-layout-app
    content: Criar (app)/layout.tsx com ProtectedRoute + Sidebar + shell visual
    status: pending
  - id: t2-sidebar
    content: "Refatorar AppSidebar: remover platformState, usar usePathname + router.push"
    status: pending
  - id: t3-pages
    content: "Criar page.tsx para cada rota: home, codes, codes/[id], contents, contents/[id], projects, projects/[id], admin"
    status: pending
  - id: t4-landing
    content: Reorganizar landing publica (page.tsx raiz ou route group (public))
    status: pending
  - id: t5-links
    content: Atualizar todos os links /?tab= para rotas novas (9 arquivos)
    status: pending
  - id: t6-middleware
    content: Atualizar middleware para nova estrutura de rotas
    status: pending
  - id: t7-auth-redirects
    content: Atualizar ProtectedRoute, login, register e utils/routes.ts
    status: pending
  - id: t8-cleanup
    content: Deletar use-platform.ts, remover interfaces PlatformState, limpar page.tsx antiga
    status: pending
  - id: t9-compat-redirect
    content: Adicionar redirect de compatibilidade /?tab=X -> /X no middleware
    status: pending
  - id: t10-build
    content: Lint + Build + verificacao final
    status: pending
isProject: false
---

# Migrar PlatformState para roteamento nativo do Next.js

## Contexto

Hoje toda navegacao passa por `usePlatform()` que mantém `activeTab` em state sincronizado com `?tab=` na URL. Isso gera:

- Uma unica `page.tsx` que renderiza todas as "paginas" com `display: hidden/block`
- Prop drilling de `platformState` em 12 arquivos
- Logica complexa de race condition e pendingTabRef
- URLs com `/?tab=codes&id=123` em vez de URLs semanticas

A migracao substitui tudo por **segmentos de rota reais** do Next.js App Router.

---

## Nova estrutura de rotas

```
frontend/app/
  (public)/
    page.tsx            <- landing publica (atual PublicHome)
    layout.tsx          <- layout sem sidebar
  (app)/
    layout.tsx          <- layout com ProtectedRoute + Sidebar + SidebarProvider
    home/page.tsx       <- Home
    codes/
      page.tsx          <- Codes (listagem)
      [id]/page.tsx     <- CodeDetailView
    contents/
      page.tsx          <- Contents (listagem)
      [id]/page.tsx     <- ContentDetail / TutorialDetail (decide por contentsTab)
    projects/
      page.tsx          <- Projects (listagem)
      [id]/page.tsx     <- ProjectDetail
    admin/page.tsx      <- AdminPanel
```

- **Route groups** `(public)` e `(app)` permitem layouts diferentes sem afetar a URL.
- A URL `/` serve a landing. `/home`, `/codes`, `/codes/abc123`, `/projects/xyz` sao as novas rotas.
- Filtros como `searchTerm`, `selectedTech`, `page` ficam em **query params locais** de cada pagina, gerenciados por `useSearchParams` -- sem state centralizado.

---

## Arquivos afetados e o que fazer em cada um

### Tarefa 1 -- Criar layout compartilhado `(app)/layout.tsx`

Criar `frontend/app/(app)/layout.tsx` com:

- `ProtectedRoute` envolvendo children
- `SidebarProvider` + `AppSidebar` + `SidebarInset`
- Header mobile com `SidebarTrigger`
- O wrapper de gradiente/fundo que hoje esta em `page.tsx`

Isso substitui toda a estrutura de shell que hoje esta em [frontend/app/page.tsx](frontend/app/page.tsx) linhas 59-121.

### Tarefa 2 -- Refatorar `AppSidebar` para usar `usePathname` + `Link`/`router.push`

Em [frontend/components/AppSidebar.tsx](frontend/components/AppSidebar.tsx):

- Remover prop `platformState` da interface
- Substituir `platformState.setActiveTab(key)` por `router.push('/key')`
- Substituir `platformState.activeTab === item.key` por comparacao com `usePathname()` (ex: `pathname.startsWith('/codes')`)
- Atualizar o `React.memo` comparator (agora nao depende de platformState)

### Tarefa 3 -- Criar as page.tsx de cada rota

Para cada segmento, mover o conteudo dos arquivos em `frontend/pages/` para `frontend/app/(app)/ROTA/page.tsx`:


| Rota                           | Origem                                           | O que muda                                                                                                                 |
| ------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `(app)/home/page.tsx`          | `pages/Home.tsx`                                 | Remover prop `platformState`; substituir `platformState.setActiveTab("codes")` por `router.push('/codes')` etc             |
| `(app)/codes/page.tsx`         | `pages/Codes.tsx`                                | Remover prop `platformState`; `searchTerm`/`selectedTech` viram state local ou query params; paginacao ja usa query params |
| `(app)/codes/[id]/page.tsx`    | `components/CodeDetailView.tsx`                  | Pegar `id` de `params.id` em vez de `searchParams.get('id')`; `handleBack` vira `router.push('/codes')`                    |
| `(app)/contents/page.tsx`      | `pages/Contents.tsx`                             | Remover `_platformState`; ja e autossuficiente                                                                             |
| `(app)/contents/[id]/page.tsx` | `pages/ContentDetail.tsx` + `TutorialDetail.tsx` | Decidir qual renderizar por query param `contentsTab` ou unificar; `handleBack` vira `router.push('/contents')`            |
| `(app)/projects/page.tsx`      | `pages/Projects.tsx`                             | Remover `platformState`; `ProjectForm` nao precisa mais de `platformState`                                                 |
| `(app)/projects/[id]/page.tsx` | `pages/ProjectDetail.tsx`                        | Remover `_platformState`; ja e autossuficiente                                                                             |
| `(app)/admin/page.tsx`         | `pages/AdminPanel.tsx`                           | Protecao de admin no proprio layout ou page                                                                                |


### Tarefa 4 -- Landing publica com route group

Criar `frontend/app/(public)/page.tsx`:

- Importa e renderiza `PublicHome`
- Layout sem sidebar

Ou: manter `frontend/app/page.tsx` renderizando `PublicHome` diretamente (mais simples, sem route group para a landing).

### Tarefa 5 -- Atualizar todos os links `?tab=` espalhados

Arquivos com URLs hardcoded `/?tab=...` que precisam mudar para rotas novas:

- [frontend/components/CardFeatureCompact.tsx](frontend/components/CardFeatureCompact.tsx) -- `/?tab=codes&id=` -> `/codes/ID`
- [frontend/components/CardFeatureModal.tsx](frontend/components/CardFeatureModal.tsx) -- `/?tab=codes&id=` -> `/codes/ID`
- [frontend/components/ProjectCard.tsx](frontend/components/ProjectCard.tsx) -- `/?tab=projects&id=` -> `/projects/ID`
- [frontend/components/AddMemberInProject.tsx](frontend/components/AddMemberInProject.tsx) -- `/?tab=projects&id=` -> `/projects/ID`
- [frontend/components/ImportProgressWidget.tsx](frontend/components/ImportProgressWidget.tsx) -- `tab: 'projects'` -> `/projects/ID`
- [frontend/components/ProjectForm.tsx](frontend/components/ProjectForm.tsx) -- `tab=projects&id=` -> `/projects/ID`; remover prop `platformState`
- [frontend/pages/AdminPanel.tsx](frontend/pages/AdminPanel.tsx) -- `/?tab=codes` -> `/codes`
- [frontend/pages/contents/[id].tsx](frontend/pages/contents/[id].tsx) -- `/?tab=contents` -> `/contents`
- [frontend/app/import-github-token/page.tsx](frontend/app/import-github-token/page.tsx) -- `/?tab=projects&id=...&gitsync=true` -> `/projects/ID?gitsync=true`

### Tarefa 6 -- Atualizar middleware

Em [frontend/middleware.ts](frontend/middleware.ts):

- Remover logica de `isRootLanding` baseada em `!searchParams.get('tab')`
- `/` e publica, `/home`, `/codes`, etc sao privadas (ou tudo dentro de `(app)` e privado via layout)
- Redirect de usuario autenticado em `/login`: de `?tab=home` para `/home`
- Atualizar matcher se necessario

### Tarefa 7 -- Atualizar `ProtectedRoute` e redirects de login/register

- [frontend/components/ProtectedRoute.tsx](frontend/components/ProtectedRoute.tsx): logica de redirect ja funciona com `pathname + search`, nao depende de `?tab=`
- [frontend/app/login/page.tsx](frontend/app/login/page.tsx): `getDefaultRoute()` -> `/home`
- [frontend/app/register/page.tsx](frontend/app/register/page.tsx): `getDefaultRoute()` -> `/home`
- [frontend/utils/routes.ts](frontend/utils/routes.ts): atualizar `TABS[x].route` para `/codes`, `/contents` etc; remover `normalizeTab`, `isValidTab` e tudo relacionado a query param `tab`

### Tarefa 8 -- Deletar `usePlatform` e limpar

- Deletar [frontend/hooks/use-platform.ts](frontend/hooks/use-platform.ts)
- Remover todas as interfaces `PlatformState` locais dos arquivos
- Remover import de `usePlatform` de `page.tsx`
- A antiga [frontend/app/page.tsx](frontend/app/page.tsx) vira a landing publica simples ou e deletada (se usar route group)

### Tarefa 9 -- Redirect de compatibilidade (opcional mas recomendado)

Adicionar um middleware rule ou uma `page.tsx` catch-all que redireciona URLs antigas:

- `/?tab=codes` -> `/codes`
- `/?tab=codes&id=abc` -> `/codes/abc`
- `/?tab=projects&id=xyz` -> `/projects/xyz`

Isso evita quebrar links compartilhados previamente. Pode ser feito no proprio middleware com poucas linhas.

### Tarefa 10 -- Lint + Build + Teste manual

- `npm run lint`
- `npm run build`
- Testar navegacao completa: landing -> login -> home -> codes -> detalhe -> voltar -> contents -> projects -> detalhe -> admin -> logout

---

## Estado que sai do `usePlatform` e onde vai


| Estado             | Destino                                             |
| ------------------ | --------------------------------------------------- |
| `activeTab`        | Eliminado -- substituido por pathname               |
| `setActiveTab`     | Eliminado -- substituido por `router.push` / `Link` |
| `searchTerm`       | State local em `Codes` (ou query param `?q=`)       |
| `selectedTech`     | State local em `Codes` (ou query param `?tech=`)    |
| `favorites`        | State local (nao e usado de fato hoje)              |
| `filteredSnippets` | Logica local em `Codes`                             |


