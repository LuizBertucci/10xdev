<!-- ed662e08-bebb-4dd4-a2e6-f944ca118885 c8554d7f-e1e8-418d-8431-93362165b48d -->
# Refatoração: Educacional → Videos

## Objetivo

Renomear toda a funcionalidade de vídeos educacionais para simplesmente "videos", removendo referências a "educacional" e "educational" do código. A página de vídeos permanecerá como rota separada em `app/videos/` acessível via sidebar.

## Escopo da Refatoração

### Frontend

- **Páginas**: 
- Renomear `app/educacional/page.tsx` → `app/videos/page.tsx`
- Renomear `app/educacional/[id]/page.tsx` → `app/videos/[id]/page.tsx`
- Renomear `app/educacional/layout.tsx` → `app/videos/layout.tsx`
- **Manter estrutura de rotas Next.js** (não mover para pages/)
- **Serviço**: `services/educationalService.ts` → `services/videoService.ts`
- **Tipos**: `EducationalVideo` → `Video`
- **Navegação**: Atualizar de `router.push('/educacional')` para `router.push('/videos')`
- **Sidebar**: Manter como página separada (não tab), atualizar rota para `/videos`

### Backend

- **Rotas API**: `/api/educational/videos` → `/api/videos`
- **Arquivo de rotas**: `routes/educationalRoutes.ts` → `routes/videoRoutes.ts`
- **Controller**: `EducationalVideoController` → `VideoController`
- **Model**: `EducationalVideoModel` → `VideoModel`
- **Tipos**: `types/educational.ts` → `types/video.ts`
- **Tabela do banco**: `educational_videos` → `videos` (migração completa via MCP Supabase)
- **Atualizar registros**: `routes/index.ts` e `server.ts`
- **Corrigir erros TypeScript**: `CardFeatureModel.ts` (tipos inferidos como never)

## Tarefas de Implementação

### 1. Backend - Corrigir Erros TypeScript no CardFeatureModel

- Corrigir erros de tipagem no `CardFeatureModel.ts` relacionados ao Supabase
- Os erros indicam que tipos estão sendo inferidos como `never` nas operações de insert/update/select
- Verificar tipagem do `supabaseTyped` e garantir que a tabela `card_features` está corretamente tipada
- Adicionar type assertions ou ajustar a tipagem conforme necessário

### 2. Backend - Renomear tipos e interfaces

- Renomear `backend/src/types/educational.ts` → `backend/src/types/video.ts`
- Atualizar todas as interfaces: `EducationalVideo*` → `Video*`
- Atualizar comentários e documentação

### 3. Backend - Renomear Model

- Renomear `EducationalVideoModel.ts` → `VideoModel.ts`
- Atualizar classe `EducationalVideoModel` → `VideoModel`
- Atualizar `tableName` de `'educational_videos'` para `'videos'`
- Atualizar imports e referências

### 4. Backend - Renomear Controller

- Renomear `EducationalVideoController.ts` → `VideoController.ts`
- Atualizar classe `EducationalVideoController` → `VideoController`
- Atualizar mensagens de resposta (remover "educacional")
- Atualizar imports e referências

### 5. Backend - Renomear Rotas

- Renomear `educationalRoutes.ts` → `videoRoutes.ts`
- Atualizar base path de `/educational` para `/videos`
- Atualizar `routes/index.ts` para usar `videoRoutes` e path `/videos`
- Atualizar `server.ts` para rate limiting em `/api/videos`
- Atualizar documentação de endpoints em `routes/index.ts`

### 6. Backend - Migração do Banco de Dados via MCP Supabase

- Criar migração SQL para renomear tabela `educational_videos` → `videos`
- **Executar via MCP**: usar `mcp_supabase_apply_migration` para aplicar a migração
- **Migração completa**: renomear tabela e atualizar todas as referências

### 7. Frontend - Renomear Serviço

- Renomear `services/educationalService.ts` → `services/videoService.ts`
- Atualizar interface `EducationalVideo` → `Video`
- Atualizar `CreateEducationalVideoData` → `CreateVideoData`
- Atualizar todas as funções e exports
- Atualizar endpoint de `/educational/videos` para `/videos`

### 8. Frontend - Renomear Rotas App Router

- Renomear `app/educacional/page.tsx` → `app/videos/page.tsx`
- Renomear `app/educacional/[id]/page.tsx` → `app/videos/[id]/page.tsx`
- Renomear `app/educacional/layout.tsx` → `app/videos/layout.tsx`
- Atualizar todas as rotas internas de `/educacional` para `/videos`
- Atualizar textos da UI (remover "educacional" de mensagens)
- Atualizar título de "Educacional" para "Videos"
- Renomear componentes: `EducacionalPage` → `VideosPage`, `EducacionalLayout` → `VideosLayout`, `EducationalVideoDetailPage` → `VideoDetailPage`

### 9. Frontend - Atualizar Sidebar

- Atualizar `AppSidebar.tsx`: trocar `router.push('/educacional')` por `router.push('/videos')`
- Atualizar label "Educacional" → "Videos"
- Atualizar tooltip
- **Manter como página separada** (não tab)

### 10. Frontend - Atualizar Imports

- Buscar e atualizar todos os imports de `educationalService` → `videoService`
- Atualizar imports de tipos `EducationalVideo` → `Video`
- Verificar componentes que usam esses serviços (ex: `TrainingVideoCard`, `AddVideoSheet`)

### 11. Testes e Validação

- Testar criação de vídeo
- Testar listagem de vídeos
- Testar visualização de detalhes
- Testar edição de vídeo
- Testar exclusão de vídeo
- Testar navegação pela sidebar (rota `/videos`)
- Verificar que não há rotas quebradas
- Verificar que o backend compila sem erros TypeScript

## Arquivos Principais a Modificar

**Backend:**

- `backend/src/models/CardFeatureModel.ts` (corrigir erros TypeScript)
- `backend/src/types/educational.ts` → `video.ts`
- `backend/src/models/EducationalVideoModel.ts` → `VideoModel.ts`
- `backend/src/controllers/EducationalVideoController.ts` → `VideoController.ts`
- `backend/src/routes/educationalRoutes.ts` → `videoRoutes.ts`
- `backend/src/routes/index.ts`
- `backend/src/server.ts`

**Frontend:**

- **Renomear**: `frontend/app/educacional/` → `app/videos/` (pasta completa)
- `frontend/services/educationalService.ts` → `videoService.ts`
- `frontend/components/AppSidebar.tsx`
- Componentes que importam o serviço (verificar `TrainingVideoCard`, `AddVideoSheet`)

## Considerações Importantes

1. **Migração do Banco**: A renomeação da tabela será feita via MCP Supabase usando `mcp_supabase_apply_migration`. Fazer migração completa renomeando `educational_videos` → `videos`.
2. **Navegação**: A página de vídeos será uma rota separada (`/videos`) acessível via sidebar, não uma tab. Manter estrutura de rotas Next.js.
3. **Detalhes do Vídeo**: A página de detalhes permanece como rota separada em `app/videos/[id]/page.tsx`.
4. **Erros TypeScript**: Corrigir os erros no CardFeatureModel antes de prosseguir com a refatoração para garantir que o backend compila corretamente.
5. **Testes**: Garantir que todas as funcionalidades continuem funcionando após a refatoração.

### To-dos

- [ ] Renomear types/educational.ts para video.ts e atualizar todas as interfaces EducationalVideo* para Video*
- [ ] Renomear EducationalVideoModel para VideoModel e atualizar tableName para videos
- [ ] Renomear EducationalVideoController para VideoController e atualizar mensagens
- [ ] Renomear educationalRoutes para videoRoutes e atualizar path de /educational para /videos
- [ ] Atualizar routes/index.ts e server.ts para usar as novas rotas de videos
- [ ] Criar migração SQL para renomear tabela educational_videos para videos
- [ ] Renomear educationalService para videoService e atualizar tipos EducationalVideo para Video
- [ ] Mover pasta app/educacional para app/videos e renomear componentes
- [ ] Atualizar AppSidebar para usar rota /videos e label Videos
- [ ] Atualizar todos os imports de educationalService para videoService em componentes
- [ ] Testar todas as funcionalidades: criar, listar, visualizar, editar e excluir vídeos