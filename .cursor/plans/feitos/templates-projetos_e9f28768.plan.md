---
name: templates-projetos
overview: Adicionar seção Templates na página de Projetos com card do template atual e botão '+' que abre modal para cadastrar novos templates, usando Storage para o zip e uma tabela dedicada para metadados.
todos:
  - id: schema-templates
    content: Criar tabela e policies de templates no Supabase (sem migration).
    status: completed
  - id: api-templates
    content: Implementar endpoints de templates no backend.
    status: completed
  - id: frontend-templates-ui
    content: Atualizar Projects.tsx com seção Templates e modal '+'.
    status: completed
  - id: storage-upload
    content: Integrar upload do zip no Storage e salvar metadados.
    status: completed
  - id: smoke-tests
    content: Validar listagem/criação/download na UI.
    status: completed
isProject: false
---

## Contexto

- A página atual de projetos está em [frontend/pages/Projects.tsx](frontend/pages/Projects.tsx) e já possui um botão de download estático do template (`/templates/starter-template.zip`).
- Não existe tabela nem endpoints de templates hoje.

## Estratégia

- Criar **tabela dedicada** para metadados (nome, descrição, versão, tags, status, download_url, etc.).
- Guardar o **zip no Supabase Storage** (bucket dedicado), com URL armazenada na tabela.
- Adicionar seção **Templates** (H2) acima da lista de projetos, exibindo cards e um botão “+” que abre modal de cadastro.

## Mudanças necessárias (arquivos)

- Backend:
- Criar tabela `project_templates` diretamente no Supabase (colunas: id, name, description, version, tags, zip_path/url, created_at, updated_at, is_active, created_by) e policies.
- Criar model/controller/rotas para templates (ex: `GET /api/templates`, `POST /api/templates`).
- Reusar cliente Supabase admin em [backend/src/database/supabase.ts](backend/src/database/supabase.ts).
- Frontend:
- Ajustar [frontend/pages/Projects.tsx](frontend/pages/Projects.tsx):
- Remover/ajustar botão de download estático.
- Adicionar seção `Templates` com card do template existente + botão “+”.
- Renderizar seção `Projetos` logo após.
- Criar serviço `templateService` (ex: `frontend/services/templateService.ts`) para listar/criar templates.
- Criar modal de cadastro (pode ficar em `Projects.tsx` ou componente separado) com upload do zip e campos de metadados.

## Fluxo pro “+” (modal)

1. Usuário seleciona zip e preenche metadados.
2. Upload do zip para Storage (bucket `templates`).
3. Persistir metadados na tabela com `zip_path`/`public_url`.
4. Recarregar lista de templates.

## Validações e UX

- Validar apenas a extensão do zip (sem limite de tamanho).
- Mensagens de sucesso/erro com toast.
- Manter download/preview acessível no card do template.

## Testes

- Smoke test de UI: seção Templates aparece e Projetos continuam listados.
- Criar template via modal e confirmar que aparece na lista.
- Download do zip via URL salva.