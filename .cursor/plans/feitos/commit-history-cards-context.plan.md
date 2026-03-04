---
name: commit history no contexto dos cards
overview: Seletor de commit (dropdown igual ao de branch) na barra do projeto. Ao selecionar um commit, filtra os cards exibidos para mostrar apenas os afetados por aquele commit, com o diff do arquivo renderizado inline dentro de cada card.
todos:
  - id: types-commit
    content: "backend/src/types/project.ts: adicionar CommitSummary, CommitFile e CommitDetail"
    status: pending
  - id: service-list-commits
    content: "GithubService: adicionar listCommits(token, owner, repo, branch, perPage, page) → GET /repos/{owner}/{repo}/commits"
    status: pending
  - id: service-get-commit
    content: "GithubService: adicionar getCommitDetail(token, owner, repo, sha) → GET /repos/{owner}/{repo}/commits/{sha} com patch de cada arquivo"
    status: pending
  - id: controller-list-commits
    content: "ProjectController: handler listCommits → GET /:id/github/commits?branch=&page= (mesmo padrão do listBranches)"
    status: pending
  - id: controller-get-commit
    content: "ProjectController: handler getCommit → GET /:id/github/commits/:sha — enriquece cada arquivo com card mapeado via GithubModel.getMappingByFilePath"
    status: pending
  - id: routes-commits
    content: "backend/src/routes/projectRoutes.ts: adicionar GET /:id/github/commits e GET /:id/github/commits/:sha"
    status: pending
  - id: frontend-service
    content: "frontend/services/projectService.ts: adicionar listCommits(projectId, branch, page) e getCommit(projectId, sha)"
    status: pending
  - id: frontend-types
    content: "frontend/types/: adicionar CommitSummary, CommitFile e CommitDetail"
    status: pending
  - id: frontend-commit-selector
    content: "ProjectDetail.tsx: adicionar seletor de commit (dropdown igual ao de branch) na barra do projeto, com busca e estado activeCommit"
    status: pending
  - id: frontend-filter-cards
    content: "ProjectDetail.tsx: quando activeCommit selecionado, buscar getCommit e filtrar cards exibidos pelos afetados; botão para limpar filtro"
    status: pending
  - id: frontend-diff-in-card
    content: "CardFeatureCompact.tsx: aceitar prop commitDiff?: CommitFile[] e renderizar DiffViewer inline abaixo do conteúdo normal quando presente"
    status: pending
  - id: frontend-diff-viewer
    content: "Criar DiffViewer.tsx: parse do patch string linha a linha, + verde / - vermelho / @@ azul, sem lib externa"
    status: pending
isProject: false
---

# Commit History no Contexto dos Cards

## Contexto

Outro dev faz push. O usuário quer ver o que mudou dentro do contexto dos cards — sem sair da página e sem modal separado. O seletor de commit funciona igual ao seletor de branch: dropdown na mesma barra, seleciona e a view dos cards se adapta.

## Fluxo do usuário

```
[branch: main ▾] [commit: abc1234 ▾]   ← mesma barra, mesmo padrão visual

Ao selecionar um commit:
→ Cards filtrados para os afetados pelo commit
→ Dentro de cada card: diff do arquivo (linhas +/-)
→ Badge "X cards afetados" + botão [✕ Limpar filtro]
```

---

## Backend

### Novos tipos (`backend/src/types/project.ts`)

```typescript
export interface CommitSummary {
  sha: string
  shortSha: string       // 7 primeiros chars
  message: string        // primeira linha
  authorName: string
  authorAvatar: string | null
  date: string           // ISO
}

export interface CommitFile {
  filename: string
  status: 'added' | 'modified' | 'removed' | 'renamed'
  additions: number
  deletions: number
  patch: string | null   // unified diff string do GitHub API
  card: { id: string; title: string } | null  // card mapeado ao arquivo
}

export interface CommitDetail extends CommitSummary {
  files: CommitFile[]
}
```

### GithubService — novos métodos

```typescript
// GET /repos/{owner}/{repo}/commits?sha={branch}&per_page={n}&page={n}
static async listCommits(token, owner, repo, branch, perPage = 30, page = 1): Promise<CommitSummary[]>

// GET /repos/{owner}/{repo}/commits/{sha}
// response.data.files[] → { filename, status, additions, deletions, patch }
static async getCommitDetail(token, owner, repo, sha): Promise<CommitDetail>
```

### ProjectController — novos handlers

Padrão idêntico ao `listBranches` (linha 546): requireId → findById → getSyncInfo → getInstallationToken → chamar service.

`getCommit` enriquece cada arquivo com o card mapeado:

```typescript
for each file in commitDetail.files:
  mapping = GithubModel.getMappingByFilePath(projectId, file.filename)
  if mapping exists:
    card = CardFeatureModel.findById(mapping.card_feature_id)
    file.card = { id, title }
```

### Rotas (após `/:id/github/branches`)

```
GET /:id/github/commits        → ProjectController.listCommits
GET /:id/github/commits/:sha   → ProjectController.getCommit
```

---

## Frontend

### Seletor de commit (`ProjectDetail.tsx`)

Mesmo estilo visual do seletor de branch (mesmo local na barra, mesmo dropdown shadcn).

- Abre o dropdown → lista os commits carregados (shortSha + mensagem truncada + autor + data relativa)
- Campo de busca interno (filtrar por mensagem ou SHA)
- Scroll infinito / "Carregar mais" (paginação)
- Selecionado → chama `getCommit(projectId, sha)` e guarda em `activeCommitDetail`

Estado adicionado ao `ProjectDetail`:

```typescript
const [commits, setCommits] = useState<CommitSummary[]>([])
const [activeCommit, setActiveCommit] = useState<CommitSummary | null>(null)
const [activeCommitDetail, setActiveCommitDetail] = useState<CommitDetail | null>(null)
const [isCommitLoading, setIsCommitLoading] = useState(false)
const [commitSearch, setCommitSearch] = useState("")
```

### Filtragem dos cards

Quando `activeCommitDetail` está definido:

- Filtrar `cards` para exibir apenas aqueles cujo `id` aparece em `activeCommitDetail.files[].card.id`
- Mapear cada card com os `CommitFile[]` correspondentes a ele
- Exibir banner: `"X cards afetados por [abc1234]"` + botão `[✕ Limpar]` que seta `activeCommit = null`

### `CardFeatureCompact.tsx` — nova prop

```typescript
// Nova prop opcional:
commitFiles?: CommitFile[]
```

Quando `commitFiles` está presente, renderizar `<DiffViewer>` logo abaixo do conteúdo do card.

### `DiffViewer.tsx` — novo componente simples

```typescript
// Props:
interface DiffViewerProps {
  files: CommitFile[]
}
```

Por arquivo: nome do arquivo + status badge + patch colorido linha a linha:

- `+` → `bg-green-50 text-green-800`
- `-` → `bg-red-50 text-red-800`
- `@@` → `bg-blue-50 text-blue-600 font-mono text-xs`
- Contexto → fundo neutro, `font-mono text-xs`

---

## Arquivos modificados


| Arquivo                                        | Ação                                              |
| ---------------------------------------------- | ------------------------------------------------- |
| `backend/src/types/project.ts`                 | Adicionar CommitSummary, CommitFile, CommitDetail |
| `backend/src/services/githubService.ts`        | Adicionar listCommits + getCommitDetail           |
| `backend/src/controllers/ProjectController.ts` | Adicionar listCommits + getCommit handlers        |
| `backend/src/routes/projectRoutes.ts`          | Adicionar 2 rotas GET                             |
| `frontend/services/projectService.ts`          | Adicionar listCommits + getCommit                 |
| `frontend/pages/ProjectDetail.tsx`             | Seletor de commit + estados + filtragem de cards  |
| `frontend/components/CardFeatureCompact.tsx`   | Aceitar prop commitFiles + renderizar DiffViewer  |
| `frontend/components/DiffViewer.tsx`           | Criar componente (novo)                           |


---

## Verificação

1. GitSync ativo → seletor de commit aparece ao lado do seletor de branch
2. Abrir dropdown → lista de commits da branch ativa carrega
3. Selecionar commit → cards filtrados para os afetados
4. Dentro de cada card → diff colorido do arquivo aparece inline
5. Banner mostra quantos cards foram afetados + botão para limpar
6. Limpar → todos os cards voltam a aparecer, sem diff
7. GitSync inativo → seletor não aparece

