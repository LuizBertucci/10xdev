---
name: migracao_bigbang_next_routes
overview: Plano completo para remover o Platform State de uma vez e migrar a navegação para roteamento nativo do Next, com foco nas tarefas técnicas de implementação.
todos:
  - id: criar-layout-auth
    content: Criar layout autenticado no App Router e mover shell/sidebar/proteção
    status: pending
  - id: criar-rotas-app
    content: Criar todas as rotas de seção e detalhe no grupo (app)
    status: pending
  - id: refatorar-sidebar-home
    content: Remover setActiveTab da navegação principal e usar push/Link
    status: pending
  - id: migrar-codes
    content: Desacoplar Codes de platformState e usar rota dinâmica para detalhe
    status: pending
  - id: migrar-contents
    content: Migrar Contents e detalhes para paths explícitos
    status: pending
  - id: migrar-projects
    content: Migrar Projects e detalhe para paths explícitos e ajustar componentes auxiliares
    status: pending
  - id: migrar-admin
    content: Mover admin para rota dedicada com guarda por role
    status: pending
  - id: hard-cut-links-antigos
    content: Remover suporte a ?tab= e manter apenas paths novos
    status: pending
  - id: remover-hook-antigo
    content: Excluir use-platform e limpar todo resquício de platformState
    status: pending
isProject: false
---

# Migração Big Bang: remover Platform State e adotar rotas Next

## Objetivo

- Eliminar totalmente `usePlatform` e `platformState` como mecanismo de navegação.
- Migrar para rotas explícitas do Next (`/codes`, `/contents`, `/projects`, etc.) em uma única entrega.
- Manter apenas estado local de UI dentro de cada página/componente.

## Arquitetura-alvo

- Página pública: `/` (landing)
- Route groups:
  - `(public)` para páginas sem shell autenticado
  - `(app)` para páginas autenticadas com sidebar/header compartilhados
- Área autenticada com layout comum (sidebar + header):
  - `/home`
  - `/codes`
  - `/codes/[id]`
  - `/contents`
  - `/contents/[id]` (detalhe post/manual)
  - `/contents/tutorials/[id]`
  - `/projects`
  - `/projects/[id]`
  - `/admin`
- Fonte de verdade de navegação: `pathname` + `searchParams` (sem `activeTab`).

## Estrutura de pastas alvo (App Router)

```text
frontend/app/
  page.tsx                         # landing pública (ou (public)/page.tsx)
  (app)/
    layout.tsx                     # ProtectedRoute + SidebarProvider + AppSidebar + shell
    home/page.tsx
    codes/page.tsx
    codes/[id]/page.tsx
    contents/page.tsx
    contents/[id]/page.tsx
    contents/tutorials/[id]/page.tsx
    projects/page.tsx
    projects/[id]/page.tsx
    admin/page.tsx
```

## Passo a passo (tarefas de implementação)

### 1) Criar shell autenticado em layout de rota

- Criar layout para área autenticada (ex.: [frontend/app/(app)/layout.tsx](frontend/app/(app)/layout.tsx)) reutilizando estrutura de `SidebarProvider`, `AppSidebar`, `SidebarInset` hoje em [frontend/app/page.tsx](frontend/app/page.tsx).
- Mover `ProtectedRoute` para esse layout para proteger todo o grupo.
- Manter `PublicHome` em `/` fora do grupo autenticado.

### 2) Definir árvore de rotas do App Router

- Criar páginas no App Router para cada seção principal:
  - [frontend/app/(app)/home/page.tsx](frontend/app/(app)/home/page.tsx)
  - [frontend/app/(app)/codes/page.tsx](frontend/app/(app)/codes/page.tsx)
  - [frontend/app/(app)/codes/[id]/page.tsx](frontend/app/(app)/codes/[id]/page.tsx)
  - [frontend/app/(app)/contents/page.tsx](frontend/app/(app)/contents/page.tsx)
  - [frontend/app/(app)/contents/[id]/page.tsx](frontend/app/(app)/contents/[id]/page.tsx)
  - [frontend/app/(app)/contents/tutorials/[id]/page.tsx](frontend/app/(app)/contents/tutorials/[id]/page.tsx)
  - [frontend/app/(app)/projects/page.tsx](frontend/app/(app)/projects/page.tsx)
  - [frontend/app/(app)/projects/[id]/page.tsx](frontend/app/(app)/projects/[id]/page.tsx)
  - [frontend/app/(app)/admin/page.tsx](frontend/app/(app)/admin/page.tsx)
- Cada página nova apenas compõe os componentes já existentes de `frontend/pages/*` no primeiro momento (sem refactor profundo).

### 3) Refatorar sidebar para navegação por rota

- Em [frontend/components/AppSidebar.tsx](frontend/components/AppSidebar.tsx):
  - Remover prop `platformState`.
  - Derivar item ativo via `usePathname()`.
  - Trocar `onClick => setActiveTab(...)` por `router.push('/codes')` ou `Link`.
  - Manter regras de mobile/sidebar iguais.

### 4) Refatorar Home para links diretos

- Em [frontend/pages/Home.tsx](frontend/pages/Home.tsx):
  - Remover interface `PlatformState` e prop `platformState`.
  - Trocar handlers para `router.push('/codes')`, `router.push('/contents')`, `router.push('/projects')`.
  - No modo público (`isPublic`), manter redirect para login com `redirect` apontando para nova rota (ex.: `/codes`).

### 5) Remover dependência de PlatformState em Codes

- Em [frontend/pages/Codes.tsx](frontend/pages/Codes.tsx):
  - Remover `platformState`/`defaultPlatformState`.
  - Tornar `searchTerm` e `selectedTech` estados locais ou query params da própria rota (`/codes?search=&tech=&page=`).
  - Garantir paginação via `router.replace` continue somente em `/codes`.
  - Navegação para detalhe deve usar `router.push('/codes/[id]')`.

### 6) Refatorar CodeDetail para rota dinâmica

- Em [frontend/components/CodeDetailView.tsx](frontend/components/CodeDetailView.tsx):
  - Remover leitura de `platformState.activeTab`.
  - Ler `id` de params da rota (via página wrapper do App Router).
  - Ajustar ação “voltar” para `router.push('/codes')` preservando query relevante quando necessário.

### 7) Refatorar conteúdos para rotas explícitas

- Em [frontend/pages/Contents.tsx](frontend/pages/Contents.tsx), [frontend/pages/ContentDetail.tsx](frontend/pages/ContentDetail.tsx), [frontend/pages/TutorialDetail.tsx](frontend/pages/TutorialDetail.tsx):
  - Remover props `platformState`.
  - Navegar entre lista/detalhe por path (`/contents/[id]` e `/contents/tutorials/[id]`).
  - Manter `contentsTab` como query param local da seção, não global.

### 8) Refatorar projetos para rotas explícitas

- Em [frontend/pages/Projects.tsx](frontend/pages/Projects.tsx) e [frontend/pages/ProjectDetail.tsx](frontend/pages/ProjectDetail.tsx):
  - Remover props `platformState`.
  - Navegação lista/detalhe via `/projects` e `/projects/[id]`.
  - Ajustar componentes auxiliares que hoje invocam `setActiveTab` (ex.: [frontend/components/ProjectForm.tsx](frontend/components/ProjectForm.tsx), [frontend/components/ProjectCard.tsx](frontend/components/ProjectCard.tsx), [frontend/components/AddMemberInProject.tsx](frontend/components/AddMemberInProject.tsx)).

### 9) Admin por rota e guarda de acesso

- Mover render do admin para [frontend/app/(app)/admin/page.tsx](frontend/app/(app)/admin/page.tsx).
- No próprio page/layout, aplicar guard de role admin e redirect para `/home` quando não autorizado.
- Remover lógica de “tab admin” de [frontend/app/page.tsx](frontend/app/page.tsx).

### 10) Hard cut de links antigos (`?tab=`)

- Em [frontend/middleware.ts](frontend/middleware.ts):
  - Remover suporte e parsing de `tab`/`id` legado na raiz (`/?tab=...`).
  - Tratar `/` somente como landing pública.
  - Garantir que fluxos OAuth/gitsync passem a redirecionar direto para paths novos (`/projects/[id]`, etc.), sem fallback legado.
  - Atualizar qualquer redirect interno ainda montado com query `tab`.

### 10.1) Checklist de hard cut de links legados

- Atualizar referências explícitas de `/?tab=...` para paths novos:
  - [frontend/components/CardFeatureCompact.tsx](frontend/components/CardFeatureCompact.tsx)
  - [frontend/components/CardFeatureModal.tsx](frontend/components/CardFeatureModal.tsx)
  - [frontend/components/ProjectCard.tsx](frontend/components/ProjectCard.tsx)
  - [frontend/components/AddMemberInProject.tsx](frontend/components/AddMemberInProject.tsx)
  - [frontend/components/ImportProgressWidget.tsx](frontend/components/ImportProgressWidget.tsx)
  - [frontend/components/ProjectForm.tsx](frontend/components/ProjectForm.tsx)
  - [frontend/pages/AdminPanel.tsx](frontend/pages/AdminPanel.tsx)
  - [frontend/pages/contents/[id].tsx](frontend/pages/contents/[id].tsx)
  - [frontend/app/import-github-token/page.tsx](frontend/app/import-github-token/page.tsx)
- Formato esperado de links:
  - `/?tab=codes&id=ID` -> `/codes/ID`
  - `/?tab=projects&id=ID` -> `/projects/ID`
  - `/?tab=contents&id=ID` -> `/contents/ID`
  - `/?tab=contents&id=ID&contentsTab=tutorials` -> `/contents/tutorials/ID`
  - `/?tab=admin` -> `/admin`

### 11) Atualizar utilitários de rota

- Reescrever [frontend/utils/routes.ts](frontend/utils/routes.ts) para operar com paths reais.
- Remover helpers centrados em `tab` (`normalizeTab`, `isValidTab`) e expor apenas helpers por pathname.

### 12) Eliminar Platform State do código

- Remover import/uso em cascata (`usePlatform`, `platformState`, `setActiveTab`) nos arquivos listados pelo grep.
- Excluir [frontend/hooks/use-platform.ts](frontend/hooks/use-platform.ts) e ajustar exports/referências quebradas.
- Simplificar [frontend/app/page.tsx](frontend/app/page.tsx):
  - manter apenas landing pública (ou transformar em redirect para `/home` quando autenticado).

### 13) Limpeza final de tipos/props

- Remover interfaces `PlatformState` locais espalhadas por páginas/componentes.
- Atualizar assinaturas e props para evitar opcionais mortos.
- Corrigir imports não usados gerados pela remoção.

## Mapeamento de estado (antes -> depois)

- `activeTab` -> eliminado; substituído por `pathname`
- `setActiveTab(tab)` -> eliminado; substituído por `router.push('/rota')`/`Link`
- `searchTerm` global -> estado local em `Codes` ou query param `?search=`
- `selectedTech` global -> estado local em `Codes` ou query param `?tech=`
- `page` global em `?tab=codes&page=` -> query local de `/codes?page=`
- `id` em `searchParams` -> segmento dinâmico (`/codes/[id]`, `/projects/[id]`, `/contents/[id]`)

## Ordem de execução recomendada (one-shot)

1. Layout/rotas base (passos 1-2)
2. Sidebar e Home (passos 3-4)
3. Codes + CodeDetail (passos 5-6)
4. Contents + detalhes (passo 7)
5. Projects + detalhes (passo 8)
6. Admin (passo 9)
7. Hard cut legado + utilitários (passos 10-11)
8. Remoção definitiva do hook e limpeza global (passos 12-13)

