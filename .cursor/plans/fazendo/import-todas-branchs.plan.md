---
name: Import automático de todas as branches em background
overview: Após conectar um repositório e importar a branch principal, sistema deve automaticamente importar todas as outras branches em background, com tracking via ImportJob separado
todos:
  - id: 240c955b-4ce3-4664-827b-8c9525887fcd
    content: ""
    status: pending
  - id: b21a5d79-1880-458e-ac74-ef735a5d32cf
    content: ""
    status: pending
  - id: 5ea022bc-5d3e-4b6d-98c6-5d3175e0b2d4
    content: ""
    status: pending
  - id: 5b902fcf-619f-4c12-8547-26a19490f353
    content: ""
    status: pending
  - id: 6f246440-896f-4314-915c-9c2f178be58d
    content: ""
    status: pending
  - id: d71e1fae-2fdb-478c-be11-157713fc9c2b
    content: ""
    status: pending
  - id: 86cf61a6-4e6f-4190-a170-d4a43fee1da9
    content: ""
    status: pending
  - id: 54ecc15b-5c0c-4118-9dc8-b711b760d347
    content: ""
    status: pending
isProject: true
---

## Contexto

**Fluxo atual**: `connectRepo` importa apenas a branch principal (default) em background. Usuário vê modal de progresso e quando termina, só tem cards da branch principal.

**Objetivo**: Após terminar branch principal, automaticamente importar TODAS as outras branches em background sequencial, com tracking visível pro usuário.

## Decisões de Design

### 1. Usar `importBranch` existente (Opção A)

- **Justificativa**: Mesmo que remova cards antigos, para branches nunca importadas isso é no-op. Não vale a pena duplicar código.
- **Impacto**: Se usuário reconectar mesmo repo, branches serão reimportadas (comportamento aceitável)

### 2. ImportJob separado para branches adicionais (Opção A)

- Criar jobs filhos vinculados ao job principal via `parent_job_id`
- Cada branch = 1 ImportJob com tipo `'branch_import'`
- Frontend mostra lista expansível de branches sendo importadas

### 3. Esperar job principal 'done' primeiro (Opção B)

- Evita concorrência de AI entre branch principal e secundárias
- Garante que usuário veja resultado principal antes de começar resto
- Implementação: polling no `updateJob` do job principal

### 4. Registrar falhas em tabela dedicada (Opção B)

- Tabela `import_branch_results`: `project_id`, `branch`, `status`, `error_message`, `created_at`
- Permite retry manual posteriormente
- Dashboard de "branches com erro" no futuro

## Implementação Técnica

### 1. Migração de Banco (Priority: HIGH)

```sql
-- Adicionar campo parent_job_id em import_jobs
ALTER TABLE import_jobs ADD COLUMN parent_job_id UUID REFERENCES import_jobs(id);
ALTER TABLE import_jobs ADD COLUMN branch_name VARCHAR(255);
ALTER TABLE import_jobs ADD COLUMN job_type VARCHAR(50) DEFAULT 'main_import';

-- Criar tabela para resultados de import de branches
CREATE TABLE import_branch_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  branch VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'running', 'success', 'failed'
  error_message TEXT,
  cards_created INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, branch)
);

CREATE INDEX idx_import_branch_results_project ON import_branch_results(project_id);
CREATE INDEX idx_import_branch_results_status ON import_branch_results(status);
```

**Arquivos**:

- Migration SQL no Supabase Dashboard (não versionado no repo)
- Atualizar tipos TypeScript em `backend/src/types/import.ts`

### 2. Model Layer (Priority: HIGH)

#### `backend/src/models/ImportJobModel.ts`

**Modificações**:

```typescript
// Adicionar aos tipos
export type ImportJobType = 'main_import' | 'branch_import'

export type CreateImportJobInput = {
  project_id: string
  job_type?: ImportJobType  // novo
  parent_job_id?: string    // novo
  branch_name?: string      // novo
  status: 'pending' | 'running' | 'done' | 'failed'
  current_step: string
  progress_percentage: number
  details?: Record<string, unknown>
}

// Novo método
static async createSubJob(
  parentJobId: string,
  projectId: string,
  branchName: string,
  details?: Record<string, unknown>
): Promise<ModelResult<ImportJob>> {
  // Criar job filho com parent_job_id
}

// Novo método
static async findChildJobs(parentJobId: string): Promise<ModelListResult<ImportJob>> {
  // Buscar todos os jobs filhos
}
```

#### Novo arquivo: `backend/src/models/ImportBranchResultModel.ts`

```typescript
export type ImportBranchResult = {
  id: string
  project_id: string
  branch: string
  status: 'pending' | 'running' | 'success' | 'failed'
  error_message?: string
  cards_created: number
  started_at?: string
  completed_at?: string
  created_at: string
}

export class ImportBranchResultModel {
  static async create(data: Omit<ImportBranchResult, 'id' | 'created_at'>): Promise<ModelResult<ImportBranchResult>>
  static async update(projectId: string, branch: string, data: Partial<ImportBranchResult>): Promise<ModelResult<ImportBranchResult>>
  static async findByProject(projectId: string): Promise<ModelListResult<ImportBranchResult>>
  static async findFailed(projectId: string): Promise<ModelListResult<ImportBranchResult>>
}
```

### 3. Service Layer (Priority: HIGH)

#### `backend/src/services/githubService.ts`

**Nova função**:

```typescript
/**
 * Importa todas as branches de um repositório em sequência
 * Cria ImportJob filhos para cada branch e registra resultado em import_branch_results
 */
static async importAllBranches(
  projectId: string,
  installationId: number,
  owner: string,
  repo: string,
  defaultBranch: string,
  userId: string,
  parentJobId: string,
  token: string
): Promise<{
  success: boolean
  totalBranches: number
  successCount: number
  failedCount: number
}> {
  // 1. Listar todas as branches
  // 2. Filtrar (excluir default branch)
  // 3. Para cada branch:
  //    a. Criar ImportJob filho
  //    b. Criar registro em import_branch_results (status: running)
  //    c. Chamar importBranch em try/catch
  //    d. Atualizar job filho e result com sucesso/falha
  // 4. Retornar estatísticas
}
```

**Modificação em `importBranch`**:

- Adicionar parâmetro opcional `onProgress?: (progress: number) => void`
- Usar para atualizar progresso do ImportJob filho

### 4. Controller Layer (Priority: HIGH)

#### `backend/src/controllers/ProjectController.ts` - `connectRepo`

**Modificações no fluxo existente**:

```typescript
// Após marcar job principal como 'done' e ativar github_sync_active
// Adicionar:

// 4. Iniciar import de todas as outras branches em background
setImmediate(async () => {
  try {
    console.log(`[connectRepo] Iniciando import de branches adicionais para projeto ${projectId}`)
    
    const result = await GithubService.importAllBranches(
      projectId,
      installationId,
      owner,
      repo,
      branch, // default branch
      userId,
      job.id, // parentJobId
      token
    )
    
    console.log(`[connectRepo] Import de branches concluído:`, result)
  } catch (error) {
    // Log error mas não falha o connectRepo (já terminou)
    console.error(`[connectRepo] Erro no import de branches adicionais:`, error)
  }
})
```

**Nova rota**:

```typescript
// GET /api/projects/:id/branch-imports
async getBranchImports(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  
  try {
    // Buscar ImportJob principal mais recente
    const mainJob = await ImportJobModel.findLatestByProject(id)
    
    if (!mainJob.success || !mainJob.data) {
      res.status(404).json({ success: false, error: 'Nenhum import encontrado' })
      return
    }
    
    // Buscar jobs filhos
    const childJobs = await ImportJobModel.findChildJobs(mainJob.data.id)
    
    // Buscar resultados detalhados
    const results = await ImportBranchResultModel.findByProject(id)
    
    res.json({
      success: true,
      data: {
        mainJob: mainJob.data,
        childJobs: childJobs.data || [],
        results: results.data || []
      }
    })
  } catch (error) {
    console.error('[getBranchImports] Erro:', error)
    res.status(500).json({ success: false, error: 'Erro ao buscar imports de branches' })
  }
}
```

### 5. Frontend (Priority: MEDIUM)

#### `frontend/components/ImportProgressModal.tsx`

**Modificações**:

```typescript
// Adicionar estado
const [activeTab, setActiveTab] = useState<'main' | 'branches'>('main')
const [branchJobs, setBranchJobs] = useState<BranchJob[]>([])
const [showBranchesTab, setShowBranchesTab] = useState(false)

// Quando job principal termina (status: done), buscar branches
useEffect(() => {
  if (jobStatus === 'done' && projectId) {
    setShowBranchesTab(true)
    fetchBranchImports()
  }
}, [jobStatus, projectId])

const fetchBranchImports = async () => {
  const response = await fetch(`/api/projects/${projectId}/branch-imports`)
  const data = await response.json()
  if (data.success) {
    setBranchJobs(data.data.childJobs)
  }
}

// Renderizar tabs
return (
  <Dialog>
    {/* ... */}
    {showBranchesTab && (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="main">Branch Principal</TabsTrigger>
          <TabsTrigger value="branches">
            Outras Branches
            {branchJobs.some(j => j.status === 'running') && (
              <span className="ml-2 animate-pulse">●</span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="main">
          {/* Progresso atual do job principal */}
        </TabsContent>
        
        <TabsContent value="branches">
          <BranchImportsList 
            jobs={branchJobs}
            onRetry={handleRetryBranch}
          />
        </TabsContent>
      </Tabs>
    )}
  </Dialog>
)
```

#### Novo componente: `frontend/components/BranchImportsList.tsx`

```typescript
type BranchJob = {
  id: string
  branch_name: string
  status: 'pending' | 'running' | 'done' | 'failed'
  progress_percentage: number
  current_step: string
  error?: string
}

export function BranchImportsList({ 
  jobs, 
  onRetry 
}: { 
  jobs: BranchJob[]
  onRetry: (branch: string) => void 
}) {
  // Lista de branches sendo importadas
  // Mostrar: nome, status, progresso, erro (se houver)
  // Botão retry para branches com falha
}
```

### 6. API Routes (Priority: MEDIUM)

#### `backend/src/routes/projectRoutes.ts`

```typescript
// Adicionar rota
router.get('/:id/branch-imports', authenticate, ProjectController.getBranchImports)
```

## Fluxo Completo

```
1. Usuário conecta repo (branch principal: "main")
   ↓
2. connectRepo cria ImportJob principal (job_type: 'main_import')
   ↓
3. Responde 202 Accepted (jobId)
   ↓
4. Frontend mostra ImportProgressModal (tab "Branch Principal")
   ↓
5. setImmediate executa import da branch main
   ↓
6. Quando termina: atualiza job principal para 'done', ativa github_sync_active
   ↓
7. NOVO: setImmediate separado inicia importAllBranches
   ↓
8. Para cada branch != main:
   a. Cria ImportJob filho (parent_job_id: jobPrincipal.id, job_type: 'branch_import')
   b. Cria registro em import_branch_results (status: running)
   c. Executa importBranch (sequencial)
   d. Atualiza job filho e result (success/failed)
   ↓
9. Frontend detecta job principal 'done', mostra tab "Outras Branches"
   ↓
10. Usuário vê lista de branches sendo importadas em tempo real
```

## Considerações de Performance

1. **Sequencial vs Paralelo**: Implementar sequencial para evitar sobrecarga de AI
2. **Rate Limiting**: Adicionar delay de 1-2s entre imports se necessário
3. **Timeout**: Cada importBranch deve ter timeout (já existe? verificar)
4. **Repos grandes**: Se >50 branches, considerar importar apenas as 20 mais recentes primeiro

## Testes

1. **Cenário**: Repo com 3 branches (main, develop, feature/x)
  - Esperado: main importada primeiro, develop e feature/x em sequência
2. **Cenário**: Falha em uma branch
  - Esperado: Erro registrado, outras branches continuam
3. **Cenário**: Reconectar mesmo repo
  - Esperado: Reimporta todas as branches (comportamento aceitável)

## Arquivos a Modificar

```
backend/src/
├── models/
│   ├── ImportJobModel.ts (adicionar createSubJob, findChildJobs)
│   └── ImportBranchResultModel.ts (novo arquivo)
├── types/
│   └── import.ts (adicionar ImportJobType, campos novos)
├── services/
│   └── githubService.ts (adicionar importAllBranches, modificar importBranch)
├── controllers/
│   └── ProjectController.ts (modificar connectRepo, adicionar getBranchImports)
└── routes/
    └── projectRoutes.ts (adicionar GET /:id/branch-imports)

frontend/components/
├── ImportProgressModal.tsx (adicionar tabs e integração)
└── BranchImportsList.tsx (novo componente)

Database:
- Adicionar colunas em import_jobs (via Supabase Dashboard)
- Criar tabela import_branch_results
```

## Estimativa

- **Backend**: 4-5 horas (models + service + controller)
- **Frontend**: 2-3 horas (modal + componente lista)
- **Testes**: 1-2 horas
- **Total**: ~8-10 horas

