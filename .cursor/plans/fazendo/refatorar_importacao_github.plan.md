---
name: refatorar_importacao_github
overview: Separar responsabilidades - GithubService (apenas conexão GitHub via API) e AiCardGroupingService (processamento via IA, sem heurística).
todos:
  - id: limpar_github_service
    content: Limpar GithubService - remover ZIP, heurística e constantes desnecessárias
    status: pending
  - id: expandir_ai_card_grouping
    content: Expandir AiCardGroupingService - adicionar constantes de filtro e funções de build
    status: pending
  - id: criar_list_repo_files
    content: Criar GithubService.listRepoFiles() para baixar arquivos via API
    status: pending
  - id: criar_process_repo
    content: Criar AiCardGroupingService.processRepo() como orquestrador
    status: pending
  - id: atualizar_card_quality_supervisor
    content: Garantir que AiCardGroupingService importe CardQualitySupervisor corretamente
    status: pending
  - id: atualizar_project_controller
    content: Atualizar ProjectController para usar novo fluxo
    status: pending
  - id: atualizar_git_sync_service
    content: Atualizar GitSyncService para usar novo fluxo
    status: pending
  - id: testar_importacao
    content: Testar importação via GitHub App
    status: pending
isProject: false
---

# Refatoração: Separação de Responsabilidades na Importação GitHub

## Objetivo

Separar claramente as responsabilidades entre:

- **GithubService**: Apenas conexão com GitHub para importar código (via GitHub App API)
- **AiCardGroupingService**: Processamento via IA (sem heurística) - grouping, build, quality

## Problema Atual

O `GithubService` faz MUITO:

1. Conexão com GitHub (ok)
2. Download de ZIP (EXCLUIR)
3. Extração de arquivos do ZIP (EXCLUIR)
4. Detecção de tech stack (EXCLUIR - IA faz)
5. Detecção de features/semântica (EXCLUIR - IA faz)
6. Agrupamento heurístico (EXCLUIR - não existirá mais, 100% IA)
7. Build de cards (MOVER para AiCardGroupingService)
8. Quality supervision (MOVER para AiCardGroupingService)
9. Conexão com IA (já está no AiCardGroupingService)

---

## Como funcionará (starting from scratch)

### Detalhe Importante: Repo Inteiro para IA

O Grok 4 Fast suporta **2 milhões de tokens** de context window. Portanto, enviaremos o repositório inteiro para a IA **sem limites**:

- Sem limite de número de arquivos
- Sem limite de tamanho de arquivo (conteúdo completo, não snippets)
- A IA processa tudo em uma única requisição

---

## Sprints de Implementação

**Estratégia**: Criar GitHub2Service.ts paralelo, testar, substituir.


| Sprint | Escopo                                                                                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | **GitHub2Service**: • CRIAR arquivo paralelo com métodos limpos • CRIAR listRepoFiles() via API GitHub • COPIAR: validateToken, getRepoDetails, getFileContent, GitHub App, Git operations, OAuth, verifyWebhookSignature |
| **2**  | **AiCardGroupingService**: • Adicionar filtro (CODE_EXTENSIONS, IGNORED_DIRS, IGNORED_FILES) • Adicionar build (buildCard, addVisaoGeralScreen, createContentBlock) • CRIAR processRepo() como orquestrador               |
| **3**  | **Testar/Validar**: • Testar GitHub2Service.listRepoFiles() com repo real • Verificar se AiCardGroupingService.processRepo() funciona                                                                                     |
| **4**  | **Substituição**: • Atualizar ProjectController para usar novo fluxo • Atualizar GitSyncService se necessário • Remover GitHubService.ts • Renomear GitHub2Service.ts → GitHubService.ts                                  |
| **5**  | **Testes Finais**: • Testar importação via GitHub App • Testar grouping via IA • Verificar quality supervisor                                                                                                             |


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

## Arquitetura-Alvo

### GithubService (apenas conexão)

```typescript
class GithubService {
  // GitHub App - já existe
  static generateAppJWT()
  static getInstallationToken(installationId)
  static listInstallationRepos(installationId)
  
  // Novas funções - baixar arquivos via API
  static async listRepoFiles(owner, repo, branch, token): Promise<FileEntry[]>
  static async getFileContent(owner, repo, path, token): Promise<string>
  static async getRepoDetails(url, token): GithubRepoInfo
  
  // OAuth - já existe
  static validateToken(token)
  static exchangeCodeForToken(code)
  static getUserInstallations(token)
  
  // Git operations - já existe
  static getLatestCommitSha(token, owner, repo, branch)
  static getCommitDiff(token, owner, repo, baseSha, headSha)
  static createBranch(token, owner, repo, branchName, fromSha)
  static updateFileContent(token, owner, repo, filePath, content, message, fileSha, branch)
  static createPullRequest(token, owner, repo, options)
  static verifyWebhookSignature(payload, signature)
}
```

### AiCardGroupingService (AI only, sem heurística)

```typescript
class AiCardGroupingService {
  // =====================
  // CONSTANTES (apenas para filtro de arquivos)
  // =====================
  // CODE_EXTENSIONS, IGNORED_DIRS, IGNORED_FILES
  // (para filtrar arquivos antes de enviar para IA)

  // =====================
  // HELPER
  // =====================
  static cleanMarkdown(text): string

  // =====================
  // IA - GROUPING
  // =====================
  static isEnabled(): boolean
  static hasConfig(): boolean
  static resolveApiKey(): string
  static mode(): 'metadata' | 'full'
  static resolveChatCompletionsUrl(): string
  static callChatCompletions(endpoint, apiKey, body)
  static normalizeAiOutput(raw): AiOutput
  static generateCardGroups(params): Promise<AiOutput>

  // =====================
  // IA - RESUMO
  // =====================
  static generateCardSummary(params, customPrompt?): Promise<{ summary: string }>

  // =====================
  // BUILD (transformar output IA em cards)
  // =====================
  static buildCard(featureName, screens, tech, lang, featureFiles, aiOverrides?): CreateCardFeatureRequest
  static addVisaoGeralScreen(card): CreateCardFeatureRequest
  static generateAutoTags(featureName, tech): string[]
  static fileToBlock(file, order): ContentBlock

  // =====================
  // PROCESSAMENTO COMPLETO (orquestrador)
  // =====================
  static async processRepo(
    files: FileEntry[],
    repoUrl: string,
    options?: {
      onProgress?: (update) => void
      onCardReady?: (card) => Promise<void>
    }
  ): Promise<{ cards, filesProcessed }>

  // =====================
  // QUALITY (usa CardQualitySupervisor)
  // =====================
  static analyzeQuality(cards, options?): QualityReport
  static applyCorrections(cards, qualityReport, options?)
}
```

## Tarefas de Implementação

### 1. Limpar GithubService

**MANTER** (já existem):

- `parseGithubUrl()` - helper interno
- `getHeaders()` - helper interno
- `validateToken()`
- `getRepoDetails()`
- `listRepoFiles()` - NOVO: lista arquivos via GitHub API (não mais ZIP)
- `getFileContent()`
- `generateAppJWT()`
- `getInstallationToken()`
- `listInstallationRepos()`
- `getLatestCommitSha()`
- `getCommitDiff()`
- `createBranch()`
- `updateFileContent()`
- `createPullRequest()`
- `exchangeCodeForToken()`
- `getUserInstallations()`
- `verifyWebhookSignature()`

**EXCLUIR** (não faz sentido sem heurística):

- `downloadRepoAsZip()`
- `extractFilesFromZip()`
- `processRepoToCards()` - método principal
- `MAX_FILE_SIZE`
- `CODE_EXTENSIONS`
- `IGNORED_DIRS`
- `IGNORED_FILES`
- `EXTENSION_TO_LANGUAGE`
- `TECH_DETECTION`
- `LAYER_PATTERNS`
- `LAYER_TO_SCREEN_NAME`
- `FEATURE_SEMANTIC_MAP`
- `FEATURE_TITLES`
- `LANGUAGE_FILE_MAP`
- `LANGUAGE_SUFFIX_MAP`
- `PATH_PATTERN_MAP`
- `detectTech()`
- `detectMainLanguage()`
- `detectFileLayer()`
- `extractFeatureName()`
- `normalizeFeatureName()`
- `mapToSemanticFeature()`
- `groupFilesByFeature()`
- `consolidateFeatures()`
- `generateFeatureTitle()`
- `generateFeatureDescription()`
- `makeSnippet()`
- `estimateCardsCount()`

---

### 2. Expandir AiCardGroupingService

**JÁ EXISTE** (manter):

- `AiOutputSchema`
- `cleanMarkdown()`
- `isEnabled()`
- `hasConfig()`
- `resolveApiKey()`
- `mode()`
- `resolveChatCompletionsUrl()`
- `callChatCompletions()`
- `normalizeAiOutput()`
- `generateCardGroups()`
- `generateCardSummary()`

**MOVER do GithubService** (apenas o necessário):

- `CODE_EXTENSIONS`
- `IGNORED_DIRS`
- `IGNORED_FILES`
- `FileEntry` (interface)
- `PackageJson` (interface)
- `getFileExtension()` - para filter
- `getLanguageFromExtension()` - para filter
- `shouldIncludeFile()` - para filter
- `buildCard()`
- `addVisaoGeralScreen()`
- `generateAutoTags()`
- `fileToBlock()`

**NOVO método**: `processRepo(files, repoUrl, options)`

---

### 3. CardQualitySupervisor

**OBS**: O CardQualitySupervisor é uma dependência interna do AiCardGroupingService (não é um serviço separado no fluxo). 
**AÇÃO**: Apenas garantir que está sendo importado corretamente pelo AiCardGroupingService.

### 4. Atualizar ProjectController

O controller deve:

1. Chamar `GithubService.listRepoFiles()` para obter arquivos
2. Chamar `AiCardGroupingService.processRepo()` com os arquivos
3. Remover dependência direta de `AiCardGroupingService.isEnabled()` e `hasConfig()`

```typescript
// Antes (ProjectController.ts:122)
const { cards, filesProcessed, aiUsed, aiCardsCreated } = await GithubService.processRepoToCards(
  url, token,
  { useAi, onProgress, onCardReady }
)

// Depois
const repoInfo = await GithubService.getRepoDetails(url, token)
const files = await GithubService.listRepoFiles(owner, repo, branch, token)
const { cards, filesProcessed, aiUsed, aiCardsCreated } = await AiCardGroupingService.processRepo(
  files, url,
  { useAi, onProgress, onCardReady }
)
```

### 5. Atualizar gitSyncService

Verificar se há outras dependências de `processRepoToCards`:

```bash
grep -r "processRepoToCards" backend/src/
```

Atualizar para novo fluxo.

## Dependências a Atualizar

1. **backend/src/controllers/ProjectController.ts** - linha 122
2. **backend/src/services/gitSyncService.ts** - linha 144

3.Possíveis outros serviços/controllers

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

