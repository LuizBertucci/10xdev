---
name: "Plano: Feature de Projetos"
overview: ""
todos: []
isProject: false
---

# Plano: Feature de Projetos

## Escopo Geral

- Projetos com nome, descrição e data de criação.
- Gerenciamento de membros (owner/admin/member) e associação n:n com `card_features`.
- Disponível via Supabase (schema + policies) e exposto pelo backend/SDK.
- Frontend Next.js com index de projetos, página de projeto e uso de cards existentes.

## Etapas

### 1. Modelagem e Migrations Supabase

- Criar tabelas `projects`, `project_members`, `project_cards` (referenciando `card_features`) em `backend/src/database/migrations/`.
- Definir RLS e policies alinhadas a `users` e `auth` em migrations SQL ou `backend/src/database/supabase.ts`.

### 2. Serviços Backend e Integração

- Implementar camadas em `backend/src/models/`, `backend/src/controllers/` e `backend/src/routes/` para CRUD, membros e cards.
- Expor endpoints REST alinhados ao padrão atual de rotas.
- Adicionar validações, autorização por papel e testes unit/integration.

### 3. Frontend Next.js

- Adicionar rotas em `frontend/app/projects/page.tsx` (lista) e `frontend/app/projects/[projectId]/page.tsx`.
- Criar componentes compartilhados (ex.: formulários, modais) em `frontend/components/projects/` conforme necessário.
- Integrar com hooks/services existentes (`frontend/utils` ou novo `frontend/services/projects.ts`).
- Implementar UI para listar projetos, criar/editar, gerenciar membros (owner/admin) e cards associados.

### 4. Integração e Feedback Visual

- Conectar frontend ao backend/Supabase (mutations/fetch, estados de carregamento/erro).
- Reutilizar componentes de cards existentes para seleção/visualização por projeto.
- Adicionar notificações/feedback onde já houver padrão (ex.: toasts).

### 5. Testes e Documentação

- Cobrir regras críticas com testes (backend: roles, associação; frontend: interações principais se houver setup).
- Atualizar documentação interna (`README`, `.cursor/scratchpad.md`) com instruções de uso e permissões.

## Todos

- schema-setup: Criar migrations e policies do Supabase para projetos/membros/cards.
- backend-impl: Implementar serviços e endpoints da feature de projetos.
- frontend-ui: Construir páginas e componentes de projetos no Next.js.
- integration-tests: Cobrir cenários principais com testes e atualizar docs.