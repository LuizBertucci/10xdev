## Plano GPT – Importar projeto do GitHub com botão "+" em `Projects`

Este plano descreve **exatamente o código** a ser implementado no backend e frontend para permitir importar um projeto diretamente de um repositório GitHub a partir da tela de projetos.

---

## Backend

### 1. `backend/src/types/project.ts`

Adicionar o novo tipo de request (perto de `CreateProjectRequest`/`UpdateProjectRequest`):

```ts
export interface ImportGitHubRequest {
  repositoryUrl: string;
}
```

---

### 2. `backend/src/controllers/ProjectController.ts`

#### 2.1. Ajustar import do topo

```ts
import { Request, Response } from 'express';
import { ProjectModel } from '@/models/ProjectModel';
import {
  ProjectMemberRole,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type ProjectQueryParams,
  type AddProjectMemberRequest,
  type UpdateProjectMemberRequest,
  type ImportGitHubRequest, // <-- ADD
} from '@/types/project';
```

#### 2.2. Novo método `importFromGitHub` na classe `ProjectController`

Adicionar dentro da classe, próximo dos outros handlers (por exemplo após o CRUD de projetos):

```ts
// ================================================
// IMPORT FROM GITHUB - POST /api/projects/import-github
// ================================================
static async importFromGitHub(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
      return;
    }

    const { repositoryUrl } = req.body as ImportGitHubRequest;
    const userId = req.user.id;

    if (!repositoryUrl || typeof repositoryUrl !== 'string') {
      res.status(400).json({
        success: false,
        error: 'URL do repositório é obrigatória',
      });
      return;
    }

    // Validar e extrair owner/repo
    const urlMatch = repositoryUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
    if (!urlMatch) {
      res.status(400).json({
        success: false,
        error: 'URL do repositório GitHub inválida. Use o formato https://github.com/owner/repo',
      });
      return;
    }

    const [, owner, repo] = urlMatch;

    // Chamar API pública do GitHub
    const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': '10xDev-App/1.0',
      },
    });

    if (!githubResponse.ok) {
      if (githubResponse.status === 404) {
        res.status(400).json({
          success: false,
          error: 'Repositório não encontrado ou é privado',
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Erro ao buscar informações do repositório no GitHub',
      });
      return;
    }

    const repoData = await githubResponse.json();

    const createPayload: CreateProjectRequest = {
      name: repoData.name ?? repo,
      description:
        repoData.description ??
        `Projeto importado do GitHub: ${repoData.full_name ?? `${owner}/${repo}`}`,
    };

    const result = await ProjectModel.create(createPayload, userId);

    if (!result.success) {
      res.status(result.statusCode ?? 400).json({
        success: false,
        error: result.error ?? 'Erro ao criar projeto',
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: result.data,
      message: 'Projeto importado com sucesso do GitHub',
    });
  } catch (error) {
    console.error('Erro no controller importFromGitHub:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
}
```

---

### 3. `backend/src/routes/projectRoutes.ts`

Adicionar rota para o import logo após as rotas CRUD:

```ts
// CRUD OPERATIONS
router.post('/', ProjectController.create);
router.get('/', ProjectController.getAll);
router.get('/:id', ProjectController.getById);
router.put('/:id', ProjectController.update);
router.delete('/:id', ProjectController.delete);

// IMPORT FROM GITHUB
router.post('/import-github', ProjectController.importFromGitHub);

// MEMBERS MANAGEMENT
router.get('/:id/members', ProjectController.getMembers);
```

---

## Frontend

### 4. `frontend/services/projectService.ts`

Adicionar método para chamar o endpoint de importação:

```ts
import { apiClient } from './apiClient';
import type { ApiResponse } from '@/types/api';
import type { Project } from '@/types';

export const projectService = {
  // ...outros métodos já existentes,

  async importFromGitHub(repositoryUrl: string) {
    const { data } = await apiClient.post<ApiResponse<Project>>('/projects/import-github', {
      repositoryUrl,
    });

    return data;
  },
};
```

(Ajustar imports/caminhos conforme a estrutura atual do seu `projectService`.)

---

### 5. `frontend/pages/Projects.tsx`

#### 5.1. Imports

Adicionar o ícone `Github` aos imports de ícones:

```ts
import { Plus, Search, Users, FileCode, Calendar, Trash2, Github } from "lucide-react";
```

Certificar-se de já ter `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `Label`, `Input`, `Button`, `toast` e `projectService` importados.

#### 5.2. Novos estados

Dentro do componente `Projects`:

```ts
const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
const [githubUrl, setGithubUrl] = useState('');
const [importing, setImporting] = useState(false);
```

#### 5.3. Handler de importação

```ts
const handleImportFromGitHub = async () => {
  if (!githubUrl.trim()) {
    toast.error('Informe a URL do repositório GitHub');
    return;
  }

  const isGitHubUrl = /github\.com\/[^/]+\/[^/]+/i.test(githubUrl);
  if (!isGitHubUrl) {
    toast.error('URL inválida. Use o formato https://github.com/owner/repo');
    return;
  }

  try {
    setImporting(true);

    const response = await projectService.importFromGitHub(githubUrl.trim());

    if (!response || !response.success) {
      toast.error(response?.error ?? 'Erro ao importar projeto do GitHub');
      return;
    }

    toast.success('Projeto importado com sucesso do GitHub!');
    setIsImportDialogOpen(false);
    setGithubUrl('');
    loadProjects();
  } catch (error: any) {
    toast.error(error?.message ?? 'Erro ao importar projeto do GitHub');
  } finally {
    setImporting(false);
  }
};
```

#### 5.4. Header com botão "+" e botão "Importar do GitHub" + Dialog

Substituir/ajustar o header para algo assim:

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold text-gray-900">Projetos</h1>
    <p className="text-gray-600 mt-1">Gerencie seus projetos e equipes</p>
  </div>

  <div className="flex items-center gap-2">
    {/* Dialog existente de Novo Projeto */}
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </DialogTrigger>
      {/* ...resto do conteúdo do Dialog já existente */}
    </Dialog>

    {/* Novo Dialog: Importar do GitHub */}
    <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Github className="h-4 w-4 mr-2" />
          Importar do GitHub
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar projeto do GitHub</DialogTitle>
          <DialogDescription>
            Cole a URL de um repositório público do GitHub para criar um projeto automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="github-url">URL do repositório</Label>
            <Input
              id="github-url"
              placeholder="https://github.com/owner/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImportFromGitHub} disabled={importing}>
            {importing ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</div>
```

---

Com esse arquivo salvo em `.cursor/plans/gpt-github-import.plan.md`, o próximo passo é aplicar essas mudanças nos arquivos reais do backend e frontend quando você quiser executar o plano.