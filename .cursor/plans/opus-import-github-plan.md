# Importar Projetos do GitHub (Opus Plan)

## Overview

Adicionar funcionalidade para importar repositórios do GitHub diretamente como CardFeatures dentro de projetos, com ícone de + no header da página de Projetos que abre um modal para inserir a URL do repositório.

## Arquitetura

O usuário poderá clicar em um botão com ícone do GitHub ao lado do "Novo Projeto" na página de Projetos. Isso abrirá um modal onde ele insere a URL do repositório. O backend buscará os arquivos via API do GitHub e criará um CardFeature com cada arquivo como uma "screen" com blocos de código.

---

## 1. Backend: GitHub Service

**Arquivo: `backend/src/services/githubService.ts`** (novo)

```typescript
// Tipos para a API do GitHub
interface GitHubRepo {
  name: string
  description: string | null
  default_branch: string
  language: string | null
}

interface GitHubTreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
}

interface GitHubTree {
  tree: GitHubTreeItem[]
  truncated: boolean
}

interface GitHubFileContent {
  content: string
  encoding: string
  path: string
}

// Extensões de código suportadas
const CODE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs',
  '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.swift', '.kt',
  '.vue', '.svelte', '.html', '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.xml', '.md', '.sql', '.sh', '.bash'
]

// Pastas/arquivos a ignorar
const IGNORE_PATTERNS = [
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  'venv', '.venv', 'coverage', '.nyc_output', '.cache',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.DS_Store', 'thumbs.db', '.env', '.env.local'
]

// Mapeamento de extensão para linguagem
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript',
  '.py': 'python', '.html': 'html', '.css': 'css',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
  '.md': 'markdown', '.sql': 'sql', '.sh': 'bash'
}

// Detectar tech principal pelo package.json ou arquivos
function detectTech(files: string[], packageJson?: any): string {
  if (packageJson?.dependencies) {
    if (packageJson.dependencies.react) return 'React'
    if (packageJson.dependencies.vue) return 'Vue.js'
    if (packageJson.dependencies.angular) return 'Angular'
    if (packageJson.dependencies.express) return 'Express'
    if (packageJson.dependencies.next) return 'React'
  }
  if (files.some(f => f.endsWith('.py'))) return 'Python'
  if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) return 'React'
  return 'JavaScript'
}

export class GitHubService {
  private baseUrl = 'https://api.github.com'

  // Extrair owner e repo da URL
  parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)/,
      /github\.com:([^\/]+)\/([^\/]+)/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return { owner: match[1], repo: match[2].replace('.git', '') }
      }
    }
    return null
  }

  // Buscar info do repositório
  async getRepoInfo(owner: string, repo: string): Promise<GitHubRepo> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`)
    if (!response.ok) {
      throw new Error(`Repositório não encontrado: ${owner}/${repo}`)
    }
    return response.json()
  }

  // Buscar árvore de arquivos
  async getRepoTree(owner: string, repo: string, branch: string): Promise<GitHubTreeItem[]> {
    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    )
    if (!response.ok) {
      throw new Error(`Erro ao buscar arquivos do repositório`)
    }
    const data: GitHubTree = await response.json()
    
    // Filtrar apenas arquivos de código
    return data.tree.filter(item => {
      if (item.type !== 'blob') return false
      if (IGNORE_PATTERNS.some(p => item.path.includes(p))) return false
      if (item.size && item.size > 100000) return false // Max 100KB
      return CODE_EXTENSIONS.some(ext => item.path.endsWith(ext))
    })
  }

  // Buscar conteúdo de um arquivo
  async getFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    )
    if (!response.ok) return ''
    
    const data: GitHubFileContent = await response.json()
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    return data.content
  }

  // Importar repositório completo
  async importRepository(url: string, options?: { branch?: string; maxFiles?: number }) {
    const parsed = this.parseGitHubUrl(url)
    if (!parsed) throw new Error('URL do GitHub inválida')

    const { owner, repo } = parsed
    const repoInfo = await this.getRepoInfo(owner, repo)
    const branch = options?.branch || repoInfo.default_branch
    const maxFiles = options?.maxFiles || 20

    const tree = await this.getRepoTree(owner, repo, branch)
    const filesToImport = tree.slice(0, maxFiles)

    // Buscar conteúdo dos arquivos
    const screens = await Promise.all(
      filesToImport.map(async (file) => {
        const content = await this.getFileContent(owner, repo, file.path, branch)
        const ext = '.' + file.path.split('.').pop()
        const language = EXTENSION_TO_LANGUAGE[ext] || 'typescript'

        return {
          name: file.path.split('/').pop() || file.path,
          description: file.path,
          route: file.path,
          blocks: [{
            id: crypto.randomUUID(),
            type: 'code' as const,
            content,
            language,
            order: 0
          }]
        }
      })
    )

    // Tentar detectar tech
    let packageJson = null
    const pkgFile = tree.find(f => f.path === 'package.json')
    if (pkgFile) {
      const pkgContent = await this.getFileContent(owner, repo, 'package.json', branch)
      try { packageJson = JSON.parse(pkgContent) } catch {}
    }

    const tech = detectTech(tree.map(f => f.path), packageJson)
    const mainLang = repoInfo.language?.toLowerCase() || 'typescript'

    return {
      title: repoInfo.name,
      description: repoInfo.description || `Importado de github.com/${owner}/${repo}`,
      tech,
      language: EXTENSION_TO_LANGUAGE['.' + mainLang] || mainLang,
      content_type: 'code',
      card_type: 'codigos',
      screens
    }
  }
}

export const githubService = new GitHubService()
```

---

## 2. Backend: Controller e Rota

**Adicionar em `backend/src/controllers/ProjectController.ts`:**

```typescript
// No topo, adicionar import
import { githubService } from '@/services/githubService'
import { CardFeatureModel } from '@/models/CardFeatureModel'

// Novo método na classe ProjectController
static async importFromGitHub(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' })
      return
    }

    const { url, branch, maxFiles, projectId } = req.body

    if (!url) {
      res.status(400).json({ success: false, error: 'URL do repositório é obrigatória' })
      return
    }

    // Importar do GitHub
    const cardData = await githubService.importRepository(url, { branch, maxFiles })

    // Criar CardFeature
    const cardResult = await CardFeatureModel.create(cardData)
    if (!cardResult.success) {
      res.status(400).json({ success: false, error: cardResult.error })
      return
    }

    // Se projectId foi passado, adicionar ao projeto
    if (projectId && cardResult.data) {
      await ProjectModel.addCard(projectId, cardResult.data.id, req.user.id)
    }

    res.status(201).json({
      success: true,
      data: cardResult.data,
      message: 'Repositório importado com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao importar do GitHub:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao importar repositório'
    })
  }
}
```

**Adicionar em `backend/src/routes/projectRoutes.ts`:**

```typescript
// Nova rota (adicionar antes das rotas com :id)
router.post('/import-github', ProjectController.importFromGitHub)
```

---

## 3. Frontend: Service

**Adicionar em `frontend/services/projectService.ts`:**

```typescript
// Novo tipo
interface ImportGitHubData {
  url: string
  branch?: string
  maxFiles?: number
  projectId?: string
}

// Novo método na classe ProjectService
async importFromGitHub(data: ImportGitHubData): Promise<ApiResponse<any> | undefined> {
  return apiClient.post<any>(`${this.endpoint}/import-github`, data)
}
```

---

## 4. Frontend: Modal de Importação

**Arquivo: `frontend/components/ImportGitHubModal.tsx`** (novo)

```tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Github, FolderGit2 } from "lucide-react"
import { toast } from "sonner"
import { projectService } from "@/services"

interface ImportGitHubModalProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
  onSuccess?: () => void
}

export default function ImportGitHubModal({ isOpen, onClose, projectId, onSuccess }: ImportGitHubModalProps) {
  const [url, setUrl] = useState("")
  const [branch, setBranch] = useState("")
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!url.trim()) {
      toast.error("Cole a URL do repositório GitHub")
      return
    }

    if (!url.includes("github.com")) {
      toast.error("URL inválida. Use uma URL do GitHub")
      return
    }

    try {
      setLoading(true)
      const response = await projectService.importFromGitHub({
        url: url.trim(),
        branch: branch.trim() || undefined,
        projectId
      })

      if (response?.success) {
        toast.success("Repositório importado com sucesso!")
        setUrl("")
        setBranch("")
        onClose()
        onSuccess?.()
      } else {
        toast.error(response?.error || "Erro ao importar repositório")
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar repositório")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Importar do GitHub
          </DialogTitle>
          <DialogDescription>
            Cole a URL de um repositório público do GitHub para importar os arquivos de código.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="github-url">URL do Repositório *</Label>
            <div className="relative">
              <FolderGit2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="github-url"
                placeholder="https://github.com/usuario/repositorio"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch">Branch (opcional)</Label>
            <Input
              id="branch"
              placeholder="main (deixe vazio para usar o padrão)"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <strong>Nota:</strong> Apenas repositórios públicos são suportados. 
            Serão importados até 20 arquivos de código.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={loading || !url.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Github className="h-4 w-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 5. Frontend: Página de Projetos

**Modificar `frontend/pages/Projects.tsx`:**

```tsx
// Adicionar imports no topo
import { Github } from "lucide-react"
import ImportGitHubModal from "@/components/ImportGitHubModal"

// Adicionar estado (dentro do componente)
const [isImportGitHubOpen, setIsImportGitHubOpen] = useState(false)

// Modificar o header (substituir o Dialog existente por este bloco)
<div className="flex items-center gap-2">
  <Button
    variant="outline"
    onClick={() => setIsImportGitHubOpen(true)}
  >
    <Github className="h-4 w-4 mr-2" />
    Importar GitHub
  </Button>
  
  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
    <DialogTrigger asChild>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Novo Projeto
      </Button>
    </DialogTrigger>
    {/* ... resto do DialogContent ... */}
  </Dialog>
</div>

// Adicionar o modal antes do fechamento do return
<ImportGitHubModal
  isOpen={isImportGitHubOpen}
  onClose={() => setIsImportGitHubOpen(false)}
  onSuccess={loadProjects}
/>
```

---

## Todos

- [ ] Criar `backend/src/services/githubService.ts`
- [ ] Adicionar método `importFromGitHub` no `ProjectController.ts`
- [ ] Adicionar rota `POST /import-github` no `projectRoutes.ts`
- [ ] Adicionar método `importFromGitHub` no `projectService.ts` (frontend)
- [ ] Criar `frontend/components/ImportGitHubModal.tsx`
- [ ] Atualizar `frontend/pages/Projects.tsx` com botão e modal
