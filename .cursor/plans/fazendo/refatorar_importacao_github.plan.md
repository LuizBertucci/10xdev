---
name: refatorar_importacao_github
overview: Consolidar refatoração em duas frentes - GithubService completo com sync e AiCardGroupingService com pipeline IA único, quality supervision e Visão Geral forte.
todos:
  - id: limpar_github_service
    content: Limpar GithubService - remover ZIP, heurística e constantes desnecessárias
    status: pending
  - id: expandir_ai_card_grouping
    content: Expandir AiCardGroupingService - adicionar constantes de filtro e funções de build
    status: completed
  - id: criar_list_repo_files
    content: Criar GithubService.listRepoFiles() para baixar arquivos via API
    status: completed
  - id: criar_process_repo
    content: Reestruturar pipeline IA do AiCardGroupingService (filtro -> grouping -> build -> quality -> visão geral), sem fallback
    status: pending
  - id: atualizar_card_quality_supervisor
    content: Integrar CardQualitySupervisor no pipeline final de cards (analyzeQuality + applyCorrections)
    status: pending
  - id: remover_aiused_fallback
    content: Remover aiUsed/useAi e fallback sem IA do fluxo de importação
    status: pending
  - id: evoluir_visao_geral
    content: Evoluir Visão Geral para resumo mais útil e estruturado por backend/frontend/outros
    status: pending
  - id: atualizar_project_controller
    content: Atualizar ProjectController para usar novo fluxo
    status: completed
  - id: atualizar_git_sync_service
    content: Atualizar GitSyncService para usar novo fluxo
    status: completed
  - id: testar_importacao
    content: Testar importação via GitHub App
    status: pending
  - id: macro1-mapear-contratos
    content: Mapear contratos atuais de GitSyncService e definir API única no GithubService
    status: pending
  - id: macro1-migrar-sync
    content: Migrar connect/syncFrom/syncTo/conflicts para GithubService com wrappers temporários
    status: pending
  - id: macro2-integrar-quality
    content: Integrar CardQualitySupervisor no fluxo AI (analisar + corrigir + métricas)
    status: pending
  - id: macro2-melhorar-visao-geral
    content: Refinar Visão Geral e padronizar resumo final dos cards
    status: pending
  - id: validar-fluxo-e-limpar-legado
    content: Validar import/sync end-to-end e planejar remoção do legado
    status: pending
isProject: false
---

# Refatoração: Separação de Responsabilidades na Importação GitHub

## Objetivo

Separar claramente as responsabilidades entre:

- **GithubService**: Apenas conexão com GitHub para importar código (via GitHub App API)
- **AiCardGroupingService**: Processamento via IA (sem heurística) - grouping, build, quality

### Decisões fechadas desta etapa

- IA será **sempre ativa por padrão** na geração de cards
- Não haverá mais fallback sem IA
- Campo/retorno `aiUsed` (e controle `useAi`) deve ser removido gradualmente dos fluxos de importação
- A tela **Visão Geral** deve ser tratada como parte obrigatória da qualidade final de cada card



## Contexto consolidado (continuação)

- Os 3 commits recentes desta frente foram:
  - `refactor: separar GithubService e AiCardGroupingService`
  - `feat: adicionar OAuth GitHub no ProjectForm`
  - `chore: atualizar plano de refatoração`
- Fluxo atual já conectado entre:
  - `backend/src/services/githubService.ts`
  - `backend/src/services/gitSyncService.ts`
  - `backend/src/services/aiCardGroupingService.ts`
  - `backend/src/services/cardQualitySupervisor.ts`
  - `backend/src/controllers/ProjectController.ts`

---

## Como funcionará (starting from scratch)

### Detalhe Importante: Repo Inteiro para IA

O Grok 4 Fast suporta **2 milhões de tokens** de context window. Portanto, enviaremos o repositório inteiro para a IA **sem limites**:

- Sem limite de número de arquivos
- Sem limite de tamanho de arquivo (conteúdo completo, não snippets)
- A IA processa tudo em uma única requisição

---

## Plano por macro (incremental)

### Macro 1 - Consolidar domínio GitHub + Sync

- Estruturar `GithubService` por fronteiras:
  - `RepoRead` (listar/baixar/metadados)
  - `RepoWrite` (branch/commit/PR)
  - `AppAuth` (JWT/install token/OAuth/webhook)
  - `SyncOrchestration` (connect/syncFrom/syncTo/conflicts)
- Migrar métodos de `gitSyncService` para `GithubService` com wrappers temporários.
- Atualizar consumidores para usar ponto único sem quebrar contratos atuais.
- Critério de sucesso:
  - Sem regressão em connect repo, syncFromGithub e syncToGithub.
  - `GitSyncService` reduzido a façade (ou removível) sem duplicação de regra.

### Macro 2 - Melhorar pipeline de geração de cards por IA

- Reestruturar `AiCardGroupingService` como pipeline único:
  - `filterFiles -> groupWithAI -> buildCards -> qualityPass -> emit/finalize`
- Integrar `CardQualitySupervisor` como etapa obrigatória:
  - `analyzeQuality`
  - `applyCorrections`
  - métricas de qualidade em progresso/log
- Remover fallback sem IA e padronizar IA como caminho único.
- Critério de sucesso:
  - Redução de duplicidade/fragmentação
  - Rastreabilidade de arquivos preservada (`route`)

### Macro 3 - Evoluir qualidade da "Visão Geral"

- Refinar `addVisaoGeralScreen` para:
  - descrição orientada a problema/benefício
  - capacidades principais sem ruído de implementação
  - seção de arquivos consistente (contagem + backend/frontend/outros)
- Reaproveitar `generateCardSummary` para pós-processamento textual.
- Critério de sucesso:
  - Todo card entregue com "Visão Geral" legível e padronizada.

### Macro 4 - Validação técnica e rollout seguro

- Validar importação real (repo público e privado com GitHub App).
- Verificar updates de progresso e ausência de exceções no background job.
- Rodar lint/smoke de sync antes de remover legado.
- Critério de sucesso:
  - Pipeline ponta a ponta funcionando sem regressão de OAuth/import/sync.

## Ordem de execução sugerida

1. Consolidar API de sync no `GithubService` com compatibilidade.
2. Integrar `CardQualitySupervisor` no pipeline IA com métricas.
3. Melhorar "Visão Geral" e formato final de summary.
4. Validar cenários reais e só então limpar legado (`GitSyncService`).

---

## Sprints AiCardGroupingService (Sprint 2 Expandido)


| Sprint  | Escopo                                                                                         | Status         |
| ------- | ---------------------------------------------------------------------------------------------- | -------------- |
| **2.1** | Constantes de filtro: CODE_EXTENSIONS, IGNORED_DIRS, IGNORED_FILES                             | ✓ Feito        |
| **2.2** | Funções de filtro: shouldIncludeFile(), getFileExtension(), getLanguageFromExtension()         | ✓ Feito        |
| **2.3** | Funções de build: buildCard(), addVisaoGeralScreen(), createContentBlock(), generateAutoTags() | ✓ Feito        |
| **2.4** | Funções de IA: refineGrouping(), normalizeAiOutput(), generateCardSummary()                    | ✓ Feito        |
| **2.5** | **Pipeline IA único**: filtro -> grouping IA -> build -> quality -> visão geral                | ✗ **PENDENTE** |
| **2.6** | **Sem fallback**: remover `aiUsed/useAi` e ramo de card único genérico                         | ✗ **PENDENTE** |
| **2.7** | CardQualitySupervisor: integrar para quality check + correções automáticas                     | ✗ **PENDENTE** |
| **2.8** | Evoluir "Visão Geral" (resumo claro, categoria/tecnologias, arquivos por camada)               | ✗ **PENDENTE** |
| **2.9** | Testar grouping com repo real e verificar qualidade dos cards                                  | ✗ **PENDENTE** |


### Detalhamento Sprint 2.5 - Pipeline IA único (sem fallback)

**Problema atual**: O fluxo atual ainda possui caminhos legados e sem qualidade final consolidada:

- Mantém controle de fallback por `useAi/aiUsed`
- Possui ramo de card único genérico (sem IA)
- Ainda não aplica quality supervision obrigatoriamente no resultado final
- Visão Geral ainda é básica e pouco orientada a valor funcional

**O que precisa fazer**:

1. Filtrar arquivos com `shouldIncludeFile()`
2. Preparar payload do repositório para IA (arquivos completos)
3. Chamar IA para grouping e normalizar output
4. Construir cards e garantir tela "Visão Geral" em cada card
5. Rodar `CardQualitySupervisor.analyzeQuality()` e `applyCorrections()`
6. Emitir somente cards finais corrigidos via `onCardReady()`
7. Ajustar retorno para não depender de `aiUsed` (IA é padrão)
8. Para cada card retornado pela IA:
  - Extrair arquivos referenciados nas screens
  - Criar `ContentBlock[]` para cada screen
  - Chamar `this.buildCard()` com os dados da IA
  - Chamar `this.addVisaoGeralScreen()`
  - Enviar para quality pass antes de emitir

---

### Flow de Informação

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GITHUB (repositório)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GithubService                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ • validateToken()                                                   │   │
│  │ • getRepoDetails()      → Obtém metadados do repo                   │   │
│  │ • listRepoFiles()       → Lista arquivos (via API)                  │   │
│  │ • getFileContent()     → Baixa conteúdo COMPLETO dos arquivos      │   │
│  │ • GitSync operations   → Sincronização bidirecional                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                         FileEntry[] (arquivos completos)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AiCardGroupingService                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. FILTRO (constantes)                                             │   │
│  │    CODE_EXTENSIONS / IGNORED_DIRS / IGNORED_FILES                   │   │
│  │    → Remove arquivos irrelevantes (node_modules, etc)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. IA - GROUPING                                                    │   │
│  │    generateCardGroups() ──► LLM (Grok 4 Fast - 2M tokens)           │   │
│  │    • Envia REPO INTEIRO (sem limites)                              │   │
│  │    • Agrupa arquivos em cards por funcionalidade de negócio         │   │
│  │    • Cada card tem: title, category, description, screens         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. BUILD                                                            │   │
│  │    buildCard() / addVisaoGeralScreen() / fileToBlock()              │   │
│  │    • Transforma output da IA em CreateCardFeatureRequest           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. QUALITY                                                          │   │
│  │    • Usa CardQualitySupervisor internamente                         │   │
│  │    • Detecta duplicados, fragmentação, conteúdo fraco              │   │
│  │    • Aplica correções (merge, remove, improve)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│                         CreateCardFeatureRequest[]                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

Apenas operações de **conexão com GitHub** (API REST):

- Validar token GitHub
- Obter detalhes do repositório
- Listar arquivos do repositório (via API, não ZIP)
- Obter conteúdo de arquivos
- Operações Git (commit, branch, PR)
- OAuth GitHub
- GitHub App (JWT, installation tokens)
- Verificação de webhook signature
- **GitSync** (sincronização bidirecional Git ↔ Cards)

### AiCardGroupingService

Lógica de **processamento de código via IA** (AI only, sem heurística):

- **Constantes de filtro**: CODE_EXTENSIONS, IGNORED_DIRS, IGNORED_FILES (para filtrar arquivos antes da IA)
- **cleanMarkdown()**: limpar output da IA
- **AiOutputSchema**: validar output da IA
- **IA - Grouping**: chamar LLM para agrupar arquivos em cards
- **IA - Resumo**: gerar resumo de cards via LLM
- **Build**: transformar output da IA em CreateCardFeatureRequest
- **Processamento completo**: orquestrar tudo (envia arquivos → IA agrupa → build → quality)

**CardQualitySupervisor**: Usado internamente para análise de qualidade (detecta duplicados, fragmentação, conteúdo fraco; aplica correções)

---

## Testes

Após refatoração:

1. Testar importação com repositório público (via API GitHub)
2. Testar importação com repositório privado (via GitHub App)
3. Testar grouping via IA
4. Verificar se quality supervisor continua funcionando
5. Verificar se tags e descrições estão corretas

## Observações

- Manter `cleanMarkdown()` tanto em githubService quanto aiCardGroupingService ou mover para utils compartilhado
- O schema `AiOutputSchema` deve suportar o output da IA
- CardQualitySupervisor é usado internamente pelo AiCardGroupingService (não é um passo separado no fluxo)

