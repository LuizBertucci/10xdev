# Plano de Implementação - Importação de Projetos do GitHub (Author: Gemini)

Este plano detalha a implementação da funcionalidade de importar projetos diretamente do GitHub para a plataforma 10xDev. O objetivo é permitir que o usuário crie um projeto a partir de um repositório existente, importando nome e descrição, mas mantendo total liberdade para editar essas informações antes da criação.

## Requisitos do Usuário
1.  **Importação Fácil:** Ícone/botão de "+" para importar.
2.  **Suporte Universal:** Repositórios públicos e privados.
3.  **Editabilidade:** O usuário deve poder editar os dados (nome, descrição) importados antes de salvar.
4.  **Design:** Interface bonita, coerente com o projeto e leve (não "bagunçada").

## Arquitetura Técnica

### 1. Backend (Node.js/Express + Supabase)

**Banco de Dados:**
- Adicionar coluna `repository_url` (TEXT, nullable) na tabela `projects`.

**Novo Serviço (`src/services/githubService.ts`):**
- Implementar função `getRepoDetails(url, token)` que chama a API do GitHub.
- Deve tratar URLs de repositórios públicos e privados (usando token se fornecido).

**Controller (`ProjectController.ts`):**
- **Novo Método `getGithubInfo`:**
    - Recebe `url` e `token` (opcional) do corpo da requisição.
    - Chama `githubService`.
    - Retorna `{ name, description, url, isPrivate }`.
- **Atualização `create`:**
    - Aceitar o campo `repositoryUrl` no corpo da requisição (`CreateProjectRequest`).
    - Salvar este campo no banco de dados.

**Rotas (`projectRoutes.ts`):**
- `POST /api/projects/github-info` (Para pré-visualização/fetch).

### 2. Frontend (Next.js/React)

**Serviço (`projectService.ts`):**
- Adicionar método `getGithubInfo(url, token)`.
- Atualizar tipos para incluir `repositoryUrl`.

**Interface (`pages/Projects.tsx`):**
- **Modificação do Modal de Criação:**
    - Adicionar um "toggle" ou abas no topo do modal: "Manual" vs "Importar do GitHub".
    - **Aba Importar:**
        - Input para URL do GitHub.
        - Input para Token (Opcional/Ocultável para repos privados).
        - Botão "Carregar Dados" (com estado de loading).
    - **Comportamento:**
        - Ao carregar, preenche os campos de `Nome` e `Descrição` do formulário principal.
        - O usuário pode editar esses campos à vontade.
        - O envio do formulário chama a rota de criação padrão, enviando também a `repositoryUrl`.
- **Lista de Projetos:**
    - Exibir um pequeno ícone do GitHub nos cards de projetos que foram importados.

## Passo a Passo de Execução

1.  **Backend - Model e Types:** Atualizar tipos TypeScript e preparar query SQL para adicionar coluna.
2.  **Backend - Lógica GitHub:** Implementar serviço de fetch do GitHub e endpoint de info.
3.  **Backend - Criação:** Atualizar lógica de `create` para persistir a URL.
4.  **Frontend - Serviço:** Conectar com o novo endpoint.
5.  **Frontend - UI:** Atualizar o modal de "Novo Projeto" com a nova aba e lógica de preenchimento automático.
6.  **Frontend - Visualização:** Adicionar indicador visual nos cards de projeto.

## Detalhes da Implementação e Código Proposto

### 1. Backend: `src/services/githubService.ts`

```typescript
import axios from 'axios'

interface GithubRepoInfo {
  name: string
  description: string | null
  url: string
  isPrivate: boolean
}

export class GithubService {
  private static parseGithubUrl(url: string): { owner: string; repo: string } | null {
    try {
      const urlObj = new URL(url)
      if (urlObj.hostname !== 'github.com') return null
      
      const parts = urlObj.pathname.split('/').filter(Boolean)
      if (parts.length < 2) return null
      
      return {
        owner: parts[0],
        repo: parts[1].replace('.git', '')
      }
    } catch {
      return null
    }
  }

  static async getRepoDetails(url: string, token?: string): Promise<GithubRepoInfo> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) {
      throw new Error('URL do GitHub inválida')
    }

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json'
      }

      if (token) {
        headers['Authorization'] = `token ${token}`
      }

      const response = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`,
        { headers }
      )

      return {
        name: response.data.name,
        description: response.data.description,
        url: response.data.html_url,
        isPrivate: response.data.private
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Repositório não encontrado. Verifique a URL ou se é um repositório privado (necessário token).')
      }
      throw error
    }
  }
}
```

### 2. Backend: Atualizações no `ProjectController.ts`

Adicionar método para validar/buscar info:

```typescript
  static async getGithubInfo(req: Request, res: Response): Promise<void> {
    try {
      const { url, token } = req.body
      if (!url) {
        res.status(400).json({ success: false, error: 'URL é obrigatória' })
        return
      }
      
      const info = await GithubService.getRepoDetails(url, token)
      res.status(200).json({ success: true, data: info })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  }
```

### 3. Backend: Model Update (`ProjectModel.ts`)

Atualizar a interface de inserção para incluir `repository_url`.

```typescript
// Na interface ProjectInsert e CreateProjectRequest
repository_url?: string | null

// No método create
const insertData: ProjectInsert = {
  // ...
  repository_url: data.repositoryUrl || null
  // ...
}
```

### 4. Frontend: UI Components (`Projects.tsx`)

Adicionar abas no Modal de Criação:

```tsx
<Tabs defaultValue="manual" className="w-full">
  <TabsList className="grid w-full grid-cols-2 mb-4">
    <TabsTrigger value="manual">Manual</TabsTrigger>
    <TabsTrigger value="github">Importar do GitHub</TabsTrigger>
  </TabsList>
  
  <TabsContent value="manual">
    {/* Inputs normais de Nome/Descrição */}
  </TabsContent>

  <TabsContent value="github">
    <div className="space-y-4">
       <div className="flex gap-2">
         <Input placeholder="https://github.com/..." value={githubUrl} onChange={...} />
         <Button onClick={handleAnalyzeGithub} disabled={loadingGithub}>
           {loadingGithub ? <Loader2 className="animate-spin" /> : <Search />}
         </Button>
       </div>
       {/* Se privado, mostrar input de Token opcional */}
    </div>
  </TabsContent>
</Tabs>
```

Ao importar com sucesso, o estado `newProjectName` e `newProjectDescription` será atualizado, permitindo ao usuário finalizar a criação normalmente.
