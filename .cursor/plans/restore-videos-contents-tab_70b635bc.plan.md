---
name: restore-videos-contents-tab
overview: Recriar a aba "Vídeos" dentro de Conteúdos (usando `public.contents` com `content_type=video`) e restaurar o layout com YouTube à esquerda e card compacto explicativo à direita, seguindo o histórico de `Videos.tsx`/`VideoDetail.tsx`.
todos:
  - id: service-types
    content: Recreate contents/video service + types mapping
    status: pending
  - id: videos-tab-list
    content: Add Videos sub-tab list UI in Contents
    status: pending
  - id: video-detail-layout
    content: Implement split layout VideoDetailView in Contents
    status: pending
  - id: routing-admin
    content: Wire routing + admin CRUD/select card actions
    status: pending
  - id: verify
    content: Manual verification of list/detail and permissions
    status: pending
isProject: false
---

- Confirmar fonte de dados: os vídeos estão em `public.contents` (campos `youtube_url`, `video_id`, `thumbnail`, `selected_card_feature_id`), então o frontend deve usar `/api/contents?type=video` e `/api/contents/:id`.
- Recriar o service/tipos do frontend para vídeos de `contents` (baseado em `TrainingContent`): adicionar `contentService`/`videoService` em `[frontend]/services` e mapear `ContentType.VIDEO`/`TrainingContent` para a resposta (incluindo `selectedCardFeatureId`).
- Adicionar uma aba "Vídeos" dentro de `[frontend]/pages/Contents.tsx` (ex.: `subtab=videos`) e reutilizar a UI histórica de listagem (search + CRUD admin). Renderizar cards com thumbnail e CTA para abrir o detalhe dentro de Conteúdos.
- Criar um `VideoDetailView` com o layout histórico: vídeo do YouTube à esquerda e card compacto explicativo à direita. Buscar o vídeo via `/api/contents/:id` e carregar o CardFeature relacionado com `selectedCardFeatureId` + `cardFeatureService.getById`.
- Ajustar o roteamento em `[frontend]/app/page.tsx` e `[frontend]/pages/ContentDetail.tsx` para que `tab=contents` + `subtab=videos` + `id` abra o `VideoDetailView`, mantendo `ContentDetailView` para posts/cards.
- Reativar as ações de admin quando necessário: `PATCH /api/contents/:id/card-feature` para vincular/remover card e `POST/PUT/DELETE /api/contents` para CRUD.
- Validar: lista de vídeos aparece, clique abre o layout dividido, voltar retorna para a aba Vídeos, admin consegue editar/deletar e usuários comuns só visualizam.

References:

- Historical layout: [frontend/pages/VideoDetail.tsx](https://github.com/LuizBertucci/10xdev/blob/21cefc938e307d93c0724118e267a3d00b5f409d/frontend/pages/VideoDetail.tsx)
- Historical list: [frontend/pages/Videos.tsx](https://github.com/LuizBertucci/10xdev/blob/21cefc938e307d93c0724118e267a3d00b5f409d/frontend/pages/Videos.tsx)
- Current contents tab: [/root/10xdev/frontend/pages/Contents.tsx](/root/10xdev/frontend/pages/Contents.tsx)
- Backend contents API: [/root/10xdev/backend/src/routes/contentRoutes.ts](/root/10xdev/backend/src/routes/contentRoutes.ts)

