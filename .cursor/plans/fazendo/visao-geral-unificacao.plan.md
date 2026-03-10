---
name: ""
overview: ""
todos: []
isProject: false
---

# Plano: Unificar "Visão Geral" — remover legado "Resumo" e gerar via IA no import

## Contexto

Existiam dois mecanismos paralelos para o mesmo fim (resumo de card):

- `buildVisaoGeralContent` + `addVisaoGeralScreen`: template estático, sem IA, criado no import. Ruim: não lê o código, só reformata metadados.
- `generateSummary` (endpoint): chama IA com paths dos arquivos, gera texto explicativo. Bom, mas só manual.

O padrão correto é: uma única função (`generateVisaoGeral`) chamada automaticamente no import e disponível manualmente na UI. "Resumo" é legado — a screen se chama "Visão Geral" em todo lugar.

## O que muda

### 1. Backend — `aiCardGroupingService.ts`

- Renomear `generateCardSummary` → `generateCardVisaoGeral`
- Atualizar filtro interno (linha 457): incluir `visão geral|visao geral` além de `resumo|sumário|summary|overview`
- Remover `addVisaoGeralScreen` e `buildVisaoGeralContent` (obsoletos)

### 2. Backend — `CardFeatureController.ts`

- Renomear `generateSummary` → `generateVisaoGeral`
- Detecção de screen existente: buscar `"visão geral"` (não mais `"resumo"` ou `"overview"`)
  - Linha 923: `s.name.toLowerCase() === 'resumo' || s.name.toLowerCase() === 'overview'`
  - Virar: `isSummaryScreen(s.name)` usando a mesma regex do resto do codebase
- Screen criada: `name: 'Visão Geral'` (não mais `'Resumo'`)
- Chamar `AiCardGroupingService.generateCardVisaoGeral(...)` (nome novo)

### 3. Backend — `cardFeatureRoutes.ts`

- Renomear rota: `/:id/generate-summary` → `/:id/generate-visao-geral`
- Apontar para `CardFeatureController.generateVisaoGeral`

### 4. Backend — `githubService.ts` (import flow)

- Em `connectRepo` `onCardReady`: após `CardFeatureModel.bulkCreate()` de um card novo:
  1. Chamar `AiCardGroupingService.generateCardVisaoGeral({ cardTitle, screens, tech, language })`
  2. Montar `CardFeatureScreen` `name: 'Visão Geral'` com o resultado
  3. `CardFeatureModel.update(cardId, { screens: [visaoGeralScreen, ...card.screens] }, userId, 'admin')`
- Em `importBranch` `onCardReady`: mesmo padrão após `bulkCreate`
- Remover chamadas a `addVisaoGeralScreen` de `generateCardGroupsFromRepo` (linhas 270 e 306)

### 5. Frontend — `cardFeatureService.ts`

- Renomear método `generateSummary` → `generateVisaoGeral`
- Endpoint: `/generate-summary` → `/generate-visao-geral`
- Tipo de retorno: `GenerateSummaryResponse` pode ser mantido ou renomeado (`GenerateVisaoGeralResponse`) — se renomear, atualizar importações

### 6. Frontend — 3 call sites

- `ProjectDetail.tsx:776`: `cardFeatureService.generateSummary` → `generateVisaoGeral`
- `CardFeatureCompact.tsx:263`: idem
- `CardFeature.tsx:108`: idem

### 7. Frontend — labels de UI

- `CardFeature.tsx:261`: `'Gerar Resumo com IA'` → `'Gerar Visão Geral'`
- `CardFeatureCompact.tsx:678`: comentário `/* Botão Gerar Resumo */` + qualquer texto visível → `'Gerar Visão Geral'`
- `CardFeatureModal.tsx`: verificar se há label de texto

### 8. Frontend — `isSummaryScreen` (3 locais)

- `CardFeatureModal.tsx:97`: remover `'sumario'` (era só legado), manter `'resumo'` e `'visao geral'`
  - Obs: manter `'resumo'` no frontend por retrocompatibilidade (cards antigos no banco ainda têm `name: 'Resumo'`)
- `CardFeature.tsx`: idem
- `CardFeatureCompact.tsx`: idem

## Arquivos a modificar


| Arquivo                                            | Mudança                                                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `backend/src/services/aiCardGroupingService.ts`    | Renomear `generateCardSummary`, remover `addVisaoGeralScreen` + `buildVisaoGeralContent`, atualizar filtro de screen |
| `backend/src/controllers/CardFeatureController.ts` | Renomear `generateSummary`, corrigir detecção/nome de screen                                                         |
| `backend/src/routes/cardFeatureRoutes.ts`          | Renomear rota                                                                                                        |
| `backend/src/services/githubService.ts`            | Integrar `generateCardVisaoGeral` no `onCardReady` (connectRepo + importBranch), remover `addVisaoGeralScreen`       |
| `frontend/services/cardFeatureService.ts`          | Renomear método + endpoint                                                                                           |
| `frontend/pages/ProjectDetail.tsx`                 | Atualizar call site                                                                                                  |
| `frontend/components/CardFeatureCompact.tsx`       | Atualizar call site + label                                                                                          |
| `frontend/components/CardFeature.tsx`              | Atualizar call site + label                                                                                          |
| `frontend/components/CardFeatureModal.tsx`         | Verificar label                                                                                                      |


## Ordem de execução

1. Backend service (`generateCardVisaoGeral`)
2. Backend controller + rota
3. Backend import flow (githubService) — remover `addVisaoGeralScreen`, integrar geração por IA
4. Frontend service
5. Frontend call sites + labels

## Verificação

- Conectar um repo de teste → cards criados devem ter aba "Visão Geral" com conteúdo gerado por IA (não template)
- Clicar no botão Sparkles num card existente → deve gerar/atualizar a aba "Visão Geral"
- Cards antigos com `name: 'Resumo'` no banco ainda aparecem como "Visão Geral" na UI (isSummaryScreen cobre ambos)
- Não deve existir mais nenhuma screen criada com `name: 'Resumo'` após as mudanças

