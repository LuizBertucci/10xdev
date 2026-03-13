---
name: ""
overview: ""
todos: []
isProject: false
---

# GitHub GitSync — Mostrar repos de membro

## Contexto

Após o commit `a1644e9`, o fluxo OAuth foi removido. O endpoint `listGithubRepos` passou a usar apenas `GET /installation/repositories` com installation token, que retorna somente repos da conta do owner da instalação. Repos onde o usuário é colaborador ou membro de org não aparecem.

A correção restaura o `code` → `user_access_token` no callback e **persiste o token na tabela `users`** (por `user_id`), garantindo que o usuário não precise reconectar a cada sessão. O token é por usuário — não há risco de ver repos de outra pessoa.

**Pré-requisito:** "Request user authorization (OAuth) during installation" deve estar habilitado nas configurações do GitHub App.

---

## Arquitetura

```
OAuth (user token)           → listUserRepos → descobrir todos os repos acessíveis
                                                 ↓
                                          usuário escolhe repo
                                                 ↓
GET /repos/{owner}/{repo}/installation  → descobrir installation_id correto do repo
                                                 ↓
GitHub App (installation token)          → connectRepo → operar no repo
```

---

## Migration necessária

```sql
ALTER TABLE users ADD COLUMN github_user_token TEXT;
```

---

## Arquivos a modificar (8)

### 1. `backend/src/services/githubService.ts`

**1a. `buildGithubInstallReturnUrl` (linhas 93–116)** — adicionar `userToken?`:

```typescript
static buildGithubInstallReturnUrl({
  frontendUrl, projectId, installationId, state, error,
  userToken
}: {
  frontendUrl: string
  projectId?: string
  installationId?: string
  state?: string
  error?: string
  userToken?: string
}): string {
  const pathname = projectId ? `/projects/${projectId}` : '/projects'
  const params = new URLSearchParams({
    github_sync: 'true',
    ...(projectId ? {} : { open_project_form: 'true' }),
    ...(installationId ? { installation_id: installationId } : {}),
    ...(state ? { state } : {}),
    ...(error ? { github_sync_error: error } : {}),
    ...(userToken ? { user_token: userToken } : {})
  })
  return `${frontendUrl}${pathname}?${params.toString()}`
}
```

**1b. Novo método `listUserRepos` após `listInstallationRepos` (linha ~457)**

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

**1c. Novo método `getRepoInstallation`**

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

Em `handleGitSyncCallback`: extrair `code`, trocar por user token, passar brevemente na URL de retorno (o frontend salva no banco e limpa a URL imediatamente):

```typescript
const { installation_id, setup_action, state, code } = req.query as {
  installation_id?: string
  setup_action?: string
  state?: string
  code?: string
}

// ... validações existentes (setup_action, installation_id) ...

let userToken: string | undefined
if (code) {
  try {
    const tokenData = await GithubService.exchangeCodeForToken(code)
    userToken = tokenData.access_token
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[GitSync Install] Falha ao trocar code por user token (continuando sem):', msg)
  }
}

res.redirect(GithubService.buildGithubInstallReturnUrl({
  frontendUrl,
  ...(projectId ? { projectId } : {}),
  installationId: installation_id,
  ...(state ? { state } : {}),
  ...(userToken ? { userToken } : {})
}))
```

---

### 4. `backend/src/controllers/ProjectController.ts`

**4a. `listGithubRepos` (linhas 563–589)** — lê token do banco via `req.user.id`. Sem token no request.

```typescript
static listGithubRepos = safeHandler(async (req, res) => {
  const installationId = Number(req.query.installation_id)
  if (!installationId) throw badRequest('installation_id é obrigatório')

  const userId = req.user?.id
  const userToken = userId ? await UserModel.getGithubToken(userId) : null

  if (!userToken) {
    res.status(401).json({
      success: false,
      error: 'Reconecte o GitHub para listar os repositórios.',
      code: 'GITHUB_TOKEN_MISSING'
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
        error: 'Acesso ao GitHub revogado. Reconecte o GitHub.',
        code: 'GITHUB_TOKEN_REVOKED'
      })
      return
    }
    throw err
  }
})
```

**4b. Novo endpoint `saveGithubUserToken`** — `PUT /api/projects/github/user-token`:

```typescript
static saveGithubUserToken = safeHandler(async (req, res) => {
  const { token } = req.body as { token?: string }
  if (!token) throw badRequest('token é obrigatório')
  const userId = req.user?.id
  if (!userId) throw badRequest('usuário não autenticado')
  await UserModel.saveGithubToken(userId, token)
  res.json({ success: true })
})
```

**4c. `connectRepo`** — resolver `installation_id` correto antes de conectar:

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

**4d. `disconnectRepo`** — limpar token do banco:

```typescript
// Adicionar após o update existente:
if (req.user?.id) await UserModel.clearGithubToken(req.user.id)
```

---

### 5. `backend/src/routes/projectRoutes.ts`

Adicionar rota para salvar token (autenticada):

```typescript
router.put('/github/user-token', auth, ProjectController.saveGithubUserToken)
```

---

### 6. `frontend/lib/githubInstallFlow.ts`

Atualizar `consumeGithubAppInstallation` para retornar o `userToken` recebido da URL (sem persistir localmente):

```typescript
export const consumeGithubAppInstallation = ({
  installationId,
  state,
  userToken,
  expectedProjectId
}: {
  installationId: string | null
  state: string | null
  userToken?: string | null
  expectedProjectId?: string | null
}): { success: true; projectId: string | null; userToken: string | null }
   | { success: false; error: string } => {
  // ... lógica existente de nonce ...
  persistGithubInstallationId(installationId)
  return { success: true, projectId: parsedState.projectId || null, userToken: userToken ?? null }
}
```

Sem helpers de sessionStorage para o token.

---

### 7. `frontend/components/ProjectForm.tsx`

**7a. `clearGithubSyncQueryParams` (linha 62)** — adicionar `'user_token'`:

```typescript
const keysToDelete = [
  'github_sync', 'installation_id', 'state',
  'open_project_form', 'github_sync_error',
  'user_token'
]
```

**7b. useEffect de hidratação (linha 104)** — extrair `user_token`, salvar no banco e limpar URL imediatamente:

```typescript
const userTokenParam = searchParams?.get('user_token')

if (installationIdParam) {
  const callbackResult = consumeGithubAppInstallation({
    installationId: installationIdParam,
    state: stateParam,
    userToken: userTokenParam
  })

  if (callbackResult.success && callbackResult.userToken) {
    // Salva no banco — fire and forget, URL é limpa logo abaixo
    projectService.saveGithubUserToken(callbackResult.userToken).catch(console.error)
  }

  clearGithubSyncQueryParams()  // remove user_token da URL imediatamente
  // ... resto inalterado
}
```

**7c. `loadAvailableRepos` (linha 137)** — sem token no request, tratar 401:

```typescript
const loadAvailableRepos = async (installId: number) => {
  try {
    setLoadingRepos(true)
    const response = await projectService.listGithubRepos(installId)

    if (!response?.success && response?.status === 401) {
      setIsGithubConnected(false)
      toast.error('Reconecte o GitHub para ver os repositórios.')
      return
    }

    if (response?.success && response.data) {
      setAvailableRepos(response.data)
    }
  } catch (error) {
    console.error('Error loading repos:', error)
    toast.error('Erro ao carregar repositórios')
  } finally {
    setLoadingRepos(false)
  }
}
```

**7d. `handleDisconnectGithub`** — remover limpeza de sessionStorage do token (o backend limpa via `disconnectRepo`).

---

### 8. `frontend/services/projectService.ts`

`listGithubRepos` sem `userToken` no request:

```typescript
async listGithubRepos(installationId: number): Promise<ApiResponse<GithubAppRepo[]> | undefined> {
  return apiClient.get<GithubAppRepo[]>(`${this.endpoint}/github/repos`, { installation_id: installationId })
}
```

Novo método `saveGithubUserToken`:

```typescript
async saveGithubUserToken(token: string): Promise<void> {
  await apiClient.put(`${this.endpoint}/github/user-token`, { token })
}
```

---

## Verificação

1. `npm run build` backend e frontend — sem erros TypeScript
2. Rodar migration: `ALTER TABLE users ADD COLUMN github_user_token TEXT`
3. Instalar GitHub App pelo ProjectForm → confirmar que lista inclui repos de colaborador/membro de org
4. Fechar aba, reabrir → confirmar que repos aparecem sem reconectar
5. Selecionar repo de org → confirmar que conecta sem erro 404/403
6. Selecionar repo de org sem app instalado → confirmar mensagem de erro 422
7. Desconectar GitHub → confirmar que `github_user_token` é limpo na tabela `users`

