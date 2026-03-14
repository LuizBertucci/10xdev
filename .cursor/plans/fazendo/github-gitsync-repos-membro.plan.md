---
name: ""
overview: ""
todos: []
isProject: false
---

# GitHub GitSync — Mostrar repos de membro

## Contexto

Após o commit `a1644e9`, o fluxo OAuth foi removido. O endpoint `listGithubRepos` passou a usar apenas `GET /installation/repositories` com installation token, que retorna somente repos da conta do owner da instalação. Repos onde o usuário é colaborador ou membro de org não aparecem.

A correção inclui o `userId` no `state` do OAuth, restaura o `code` → `user_access_token` no callback e **persiste o token direto no banco** (por `user_id`) no próprio callback do backend — o token nunca passa pelo frontend. O token é por usuário — não há risco de ver repos de outra pessoa.

**Pré-requisito:** "Request user authorization (OAuth) during installation" deve estar habilitado nas configurações do GitHub App.

---

## Arquitetura

```
Frontend inicia install       → state inclui userId (base64)
                                          ↓
GitHub callback (backend)     → extrai code + userId do state
                              → exchangeCodeForToken(code) → user_access_token
                              → UserModel.saveGithubToken(userId, token)
                              → redirect para frontend (SEM token na URL)
                                          ↓
Frontend lista repos          → GET /github/repos (autenticado)
                              → backend lê token do banco via req.user.id
                              → listUserRepos(token) → todos os repos acessíveis
                                          ↓
                                   usuário escolhe repo
                                          ↓
GET /repos/{owner}/{repo}/installation  → descobrir installation_id correto do repo
                                          ↓
GitHub App (installation token)         → connectRepo → operar no repo
```

---

## Migration necessária

```sql
ALTER TABLE users ADD COLUMN github_user_token TEXT;
```

**Status: JA APLICADA** — coluna `github_user_token` (text, nullable) já existe na tabela `users`.

---

## Arquivos a modificar (6)

### 1. `backend/src/services/githubService.ts`

**1a. `OAuthStateData` e `parseStateParameter`** — adicionar `userId`:

```typescript
type OAuthStateData = {
  origin?: string
  projectId?: string
  nonce?: string
  userId?: string
}
```

`parseStateParameter` já faz parse genérico de JSON, basta adicionar a extração:

```typescript
const userId = typeof parsed.userId === 'string' ? parsed.userId : undefined
return { origin, projectId, nonce, userId }
```

**1b. `buildGithubInstallReturnUrl`** — sem alteração (não recebe mais `userToken`).

**1c. Novo método `listUserRepos` após `listInstallationRepos` (linha ~457)**

```typescript
static async listUserRepos(userAccessToken: string): Promise<unknown[]> {
  const repos: unknown[] = []
  let page = 1
  const perPage = 100
  let hasMore = true

  while (hasMore) {
    const response = await axios.get('https://api.github.com/user/repos', {
      params: {
        affiliation: 'owner,collaborator,organization_member',
        sort: 'updated',
        per_page: perPage,
        page
      },
      headers: {
        Authorization: `token ${userAccessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    const data: unknown[] = response.data
    repos.push(...data)
    if (data.length < perPage) hasMore = false
    else page++
  }

  return repos.map(r => ({
    id: (r as { id?: number }).id || 0,
    name: (r as { name?: string }).name || '',
    full_name: (r as { full_name?: string }).full_name || '',
    description: (r as { description?: string }).description || null,
    private: (r as { private?: boolean }).private || false,
    language: (r as { language?: string }).language || null,
    default_branch: (r as { default_branch?: string }).default_branch || '',
    html_url: (r as { html_url?: string }).html_url || '',
    owner: {
      login: (r as { owner?: { login?: string } }).owner?.login || '',
      avatar_url: (r as { owner?: { avatar_url?: string } }).owner?.avatar_url || ''
    }
  }))
}
```

**1d. Novo método `getRepoInstallation`**

Descobre qual installation do GitHub App controla um repo específico (para resolver installation_id correto ao conectar repo de org):

```typescript
static async getRepoInstallation(owner: string, repo: string): Promise<{ id: number } | null> {
  try {
    const jwt = this.generateAppJWT()
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/installation`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )
    return { id: response.data.id as number }
  } catch {
    return null
  }
}
```

Retorna `null` se o GitHub App não estiver instalado no owner do repo.

---

### 2. `backend/src/models/UserModel.ts`

Adicionar 3 métodos para gerenciar o token por usuário na tabela `users`:

```typescript
static async saveGithubToken(userId: string, token: string): Promise<void> {
  await executeQuery(
    supabaseAdmin
      .from('users')
      .update({ github_user_token: token, updated_at: new Date().toISOString() })
      .eq('id', userId)
  )
}

static async getGithubToken(userId: string): Promise<string | null> {
  const { data } = await executeQuery(
    supabaseAdmin
      .from('users')
      .select('github_user_token')
      .eq('id', userId)
      .single()
  )
  return (data as { github_user_token?: string | null } | null)?.github_user_token ?? null
}

static async clearGithubToken(userId: string): Promise<void> {
  await executeQuery(
    supabaseAdmin
      .from('users')
      .update({ github_user_token: null, updated_at: new Date().toISOString() })
      .eq('id', userId)
  )
}
```

---

### 3. `backend/src/server.ts`

**Adicionar import** no topo do arquivo (junto com o import de `GithubService`):

```typescript
import { UserModel } from '@/models/UserModel'
```

Em `handleGitSyncCallback`: extrair `code`, trocar por user token e **salvar direto no banco** via `userId` do state (token nunca vai para o frontend):

```typescript
const { installation_id, setup_action, state, code } = req.query as {
  installation_id?: string
  setup_action?: string
  state?: string
  code?: string
}

// ... validações existentes (setup_action, installation_id) ...

// Trocar code por user token e salvar no banco
if (code) {
  try {
    const tokenData = await GithubService.exchangeCodeForToken(code)
    const parsedState = GithubService.parseStateParameter(state)
    if (parsedState.userId && tokenData.access_token) {
      await UserModel.saveGithubToken(parsedState.userId, tokenData.access_token)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[GitSync Install] Falha ao salvar user token (continuando sem):', msg)
  }
}

// Redirect SEM token na URL
res.redirect(GithubService.buildGithubInstallReturnUrl({
  frontendUrl,
  ...(projectId ? { projectId } : {}),
  installationId: installation_id,
  ...(state ? { state } : {})
}))
```

---

### 4. `backend/src/controllers/ProjectController.ts`

**4a. `listGithubRepos` (linhas 563–589)** — lê token do banco via `req.user.id`. O `installation_id` da query agora é opcional (mantido para backwards compatibility, mas não é mais obrigatório).

**Adicionar import** no topo (junto com os outros imports de model):

```typescript
import { UserModel } from '@/models/UserModel'
```

```typescript
static listGithubRepos = safeHandler(async (req, res) => {
  const userId = req.user?.id
  const userToken = userId ? await UserModel.getGithubToken(userId) : null

  if (!userToken) {
    res.status(401).json({
      success: false,
      error: 'Reconecte o GitHub para listar os repositórios.'
    })
    return
  }

  try {
    const repos = await GithubService.listUserRepos(userToken)
    res.json({ success: true, data: repos, count: repos.length })
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } }
    if (axiosErr.response?.status === 401) {
      if (userId) await UserModel.clearGithubToken(userId)
      res.status(401).json({
        success: false,
        error: 'Acesso ao GitHub revogado. Reconecte o GitHub.'
      })
      return
    }
    throw err
  }
})
```

**4b. `connectRepo`** — resolver `installation_id` correto antes de conectar:

```typescript
// Após extrair owner/repo do body:
const repoInstallation = await GithubService.getRepoInstallation(owner, repo)
if (!repoInstallation) {
  res.status(422).json({
    success: false,
    error: `Instale o GitHub App na organização/conta "${owner}" para conectar este repositório.`
  })
  return
}
const resolvedInstallationId = repoInstallation.id

const result = await GithubService.connectRepo(id, resolvedInstallationId, owner, repo, ...)
```

**4c. `disconnectRepo`** — **NÃO limpar** o `github_user_token`. O token é per-user, não per-project. Se o usuário tiver múltiplos projetos conectados, limpar o token ao desconectar um projeto quebraria a listagem de repos nos outros. O token só é limpo automaticamente quando o GitHub retorna 401 (token revogado) — tratado no `listGithubRepos` acima.

---

### 5. `frontend/lib/githubInstallFlow.ts`

**5a. `beginGithubAppInstallation`** — incluir `userId` no state:

```typescript
export const beginGithubAppInstallation = (projectId?: string | null, userId?: string | null): string => {
  // ... nonce existente ...

  const stateData = JSON.stringify({
    origin: window.location.origin,
    projectId: projectId || '',
    nonce,
    userId: userId || ''
  })
  const state = btoa(stateData)

  return `${GITHUB_APP_INSTALL_URL}?state=${encodeURIComponent(state)}`
}
```

**5b. `consumeGithubAppInstallation`** — sem alteração (não recebe mais `userToken`).

---

### 6. `frontend/components/ProjectForm.tsx`

**6a. Importar `useAuth` e passar `userId`** ao `beginGithubAppInstallation`:

```typescript
// Adicionar import:
import { useAuth } from '@/hooks/useAuth'

// Dentro do componente ProjectForm, junto com os outros hooks:
const { user } = useAuth()

// Em handleConnectGithub, passar userId:
const installUrl = beginGithubAppInstallation(null, user?.id)
```

**6b. `loadAvailableRepos` (linha 137)** — tratar 401 (token ausente/revogado). O `apiClient` lança `ApiError` com `statusCode` quando o backend retorna status != 2xx, então a verificação deve estar no `catch`:

```typescript
const loadAvailableRepos = async (installId: number) => {
  try {
    setLoadingRepos(true)
    const response = await projectService.listGithubRepos(installId)

    if (response?.success && response.data) {
      setAvailableRepos(response.data)
    }
  } catch (error) {
    const apiErr = error as { statusCode?: number }
    if (apiErr?.statusCode === 401) {
      setIsGithubConnected(false)
      toast.error('Reconecte o GitHub para ver os repositórios.')
      return
    }
    console.error('Error loading repos:', error)
    toast.error('Erro ao carregar repositórios')
  } finally {
    setLoadingRepos(false)
  }
}
```

**6c. `handleDisconnectGithub`** — sem alteração necessária (já não há token no sessionStorage para limpar; o token vive no banco e é limpo apenas quando revogado pelo GitHub).

**6d. `clearGithubSyncQueryParams`** — sem alteração (não há mais `user_token` na URL).

---

### 7. `frontend/services/projectService.ts`

`listGithubRepos` — sem alteração (já não passa token; backend resolve via `req.user.id`).

---

## Verificação

1. `npm run build` backend e frontend — sem erros TypeScript
2. Migration já aplicada: `ALTER TABLE users ADD COLUMN github_user_token TEXT`
3. Instalar GitHub App pelo ProjectForm → confirmar que lista inclui repos de colaborador/membro de org
4. Fechar aba, reabrir → confirmar que repos aparecem sem reconectar (token persiste no banco)
5. Selecionar repo de org → confirmar que conecta sem erro 404/403
6. Selecionar repo de org sem app instalado → confirmar mensagem de erro 422
7. Desconectar GitHub de um projeto → confirmar que `github_user_token` **permanece** na tabela `users` (token é per-user, não per-project)
8. Revogar token no GitHub → confirmar que ao listar repos, o backend detecta 401, limpa o token e retorna mensagem "Reconecte o GitHub"

