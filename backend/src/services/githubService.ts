import axios from 'axios'
import AdmZip from 'adm-zip'
import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { GithubRepoInfo } from '@/types/project'
import { CardType, ContentType, Visibility } from '@/types/cardfeature'
import type { CardFeatureScreen, ContentBlock, CreateCardFeatureRequest } from '@/types/cardfeature'
import { AiCardGroupingService } from '@/services/aiCardGroupingService'
import { CardQualitySupervisor } from '@/services/cardQualitySupervisor'
import { normalizeTag, normalizeTags } from '@/utils/tagNormalization'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

// ================================================
// CONFIGURATION
// ================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB por arquivo

const CODE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw', '.java', '.kt', '.kts',
  '.go', '.rs', '.rb', '.php',
  '.c', '.cpp', '.cc', '.h', '.hpp',
  '.cs', '.swift', '.vue', '.svelte',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.toml',
  '.md', '.mdx', '.sql',
  '.sh', '.bash', '.zsh',
  '.dockerfile', '.env'
]

const IGNORED_DIRS = [
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.venv', 'venv', '.idea', '.vscode', 'coverage', '.cache', '.turbo',
  'vendor', '.yarn', '.pnpm', 'out', '.output', 'target', 'bin', 'obj',
  '__tests__', '__mocks__', 'test', 'tests', 'spec', 'specs', 'e2e',
  'cypress', 'playwright', '.github', '.husky'
]

const IGNORED_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store',
  'thumbs.db', '.gitignore', '.gitattributes', '.npmrc', '.nvmrc',
  '.prettierrc', '.prettierignore', '.eslintrc', '.eslintrc.js',
  '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs',
  'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
  'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.mjs',
  'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js',
  'postcss.config.mjs', '.env.example', '.env.local', '.env.development',
  '.env.production', 'LICENSE', 'LICENSE.md', 'CHANGELOG.md',
  'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.editorconfig'
]

/** Mapeamento de extensões de arquivo para linguagens de programação.
 *  Usado para syntax highlighting e detecção de tech stack. */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.pyw': 'python',
  '.java': 'java', '.kt': 'kotlin', '.kts': 'kotlin',
  '.go': 'go', '.rs': 'rust', '.rb': 'ruby', '.php': 'php',
  '.c': 'c', '.cpp': 'cpp', '.cc': 'cpp', '.h': 'c', '.hpp': 'cpp',
  '.cs': 'csharp', '.swift': 'swift',
  '.vue': 'vue', '.svelte': 'svelte',
  '.html': 'html', '.htm': 'html',
  '.css': 'css', '.scss': 'scss', '.sass': 'sass', '.less': 'less',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
  '.md': 'markdown', '.mdx': 'markdown',
  '.sql': 'sql', '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
  '.dockerfile': 'dockerfile', '.env': 'plaintext'
}

/** Keywords para detecção automática de framework/tech stack a partir de package.json.
 *  Mapeia nome do pacote (ou parte) para nome legível da tecnologia. */
const TECH_DETECTION: Record<string, string> = {
  react: 'React', next: 'Next.js', vue: 'Vue.js', angular: 'Angular',
  svelte: 'Svelte', express: 'Express', fastify: 'Fastify', nest: 'NestJS',
  django: 'Django', flask: 'Flask', fastapi: 'FastAPI'
}

/** Regex patterns para detectar a camada técnica de um arquivo pelo seu path.
 *  Usado para agrupar arquivos em "screens" (Backend - Controller, Frontend - Hook, etc).
 *  Rotas: aceita diretórios /routes|router/ OU arquivos .../routes.ts /router.ts.
 *  API: preciso para Next.js pages/api/* ou diretório /api/.
 *  Pages: inclui app router (app/ exceto api). */
const LAYER_PATTERNS: Record<string, RegExp> = {
  routes: /(?:\/(routes?|routers?)\/|\/(routes?|router)\.(t|j)sx?$)/i,
  controllers: /\/(controllers?)\//i,
  services: /\/(services?)\//i,
  models: /\/(models?)\//i,
  middlewares: /\/(middlewares?)\//i,
  validators: /\/(validators?|validations?)\//i,
  api: /(?:\/pages\/api\/|\/api\/)/i,
  hooks: /\/(hooks?)\//i,
  components: /\/(components?)\//i,
  pages: /(?:\/(pages?)\/|\/app\/(?!api\/))/i,
  stores: /\/(stores?|state)\//i,
  utils: /\/(utils?|helpers?|lib)\//i,
  types: /\/(types?|interfaces?)\/|\.d\.ts$/i
}

/** Nomes amigáveis para cada camada técnica, usados como título das screens nos cards.
 *  Exibe "Backend - Controller" ao invés de apenas "controllers". */
const LAYER_TO_SCREEN_NAME: Record<string, string> = {
  routes: 'Backend - Routes', controllers: 'Backend - Controller',
  services: 'Backend - Service', models: 'Backend - Model',
  middlewares: 'Backend - Middleware', validators: 'Backend - Validators',
  hooks: 'Frontend - Hook', components: 'Frontend - Component',
  pages: 'Frontend - Page', stores: 'Frontend - Store',
  api: 'Frontend - API Service', utils: 'Utils', types: 'Types', other: 'Other'
}

/** Remove formatacao Markdown de texto (negrito, italico, links, etc). */
function cleanMarkdown(text: string): string {
  if (!text) return text
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .trim()
}

// ================================================
// FEATURE DETECTION MAPS
// ================================================

/** Mapeamento semantico: feature → keywords que pertencem a ela.
 *  Usado para agrupar arquivos relacionados em cards coesos.
 *  Ex: 'auth' agrupa auth.ts, login.tsx, jwt.ts, session.py, etc. */
const FEATURE_SEMANTIC_MAP: Record<string, string[]> = {
  'auth': ['auth', 'login', 'logout', 'register', 'signup', 'signin', 'password', 'session', 'token', 'jwt', 'oauth', 'credential', 'authentication'],
  'user': ['user', 'profile', 'account', 'avatar', 'preferences', 'member'],
  'payment': ['payment', 'billing', 'checkout', 'stripe', 'invoice', 'subscription', 'pricing'],
  'database': ['supabase', 'database', 'db', 'prisma', 'drizzle', 'postgres', 'mysql', 'mongo', 'migration', 'serializers', 'orm', 'querysets', 'repository', 'entity', 'gorm', 'jpa', 'hibernate', 'activerecord'],
  'n8n': ['n8n', 'workflow', 'automation', 'node', 'trigger', 'webhook', 'execution'],
  'ai': ['ai', 'openai', 'gpt', 'llm', 'embedding', 'vector', 'langchain', 'claude', 'anthropic'],
  'notification': ['notification', 'alert', 'toast', 'email', 'sms', 'push', 'mail', 'mailer', 'nodemailer'],
  'card': ['card', 'cardfeature', 'feature'],
  'project': ['project', 'projeto', 'import', 'github', 'repo', 'repository'],
  'template': ['template'],
  'content': ['content', 'conteudo', 'post', 'article'],
  'admin': ['admin', 'dashboard', 'backoffice'],
  'api': ['apiclient', 'httpclient', 'axios', 'fetch'],
  'storage': ['storage', 'upload', 'file', 's3', 'bucket', 'blob'],
  'middleware': ['middleware', 'cors', 'error', 'ratelimit', 'ratelimiter', 'limiter', 'decorators', 'beforerequest', 'afterrequest', 'interceptor', 'filter', 'aspect', 'concern', 'rack'],
  'routing': ['route', 'router', 'routing', 'protected', 'protectedroute', 'guard'],
  'ui': ['button', 'input', 'dialog', 'modal', 'dropdown', 'form', 'table', 'layout', 'sidebar', 'navigation', 'toast', 'alert'],
  'docs': ['readme', 'documentation', 'docs', 'guide', 'tutorial', 'changelog', 'contributing', 'license', 'roadmap', 'architecture', 'design'],
  'skill': ['skill', 'skills'],
  'utils': ['util', 'utils', 'helper', 'helpers', 'lib', 'libs', 'common', 'shared', 'constants', 'types'],
  'config': ['config', 'configuration', 'settings', 'env', 'environment', 'setup', 'initialize', 'server'],
  'test': ['test', 'tests', 'spec', 'testing', '__tests__', 'e2e', 'integration', 'unit', 'mock', 'fixture'],
  'build': ['build', 'webpack', 'vite', 'rollup', 'esbuild', 'tsconfig', 'babel', 'eslint', 'prettier', 'lint', 'format'],
  'style': ['css', 'scss', 'sass', 'less', 'style', 'styles', 'tailwind', 'theme', 'colors'],
  'hook': ['hook', 'hooks'],
  'controller': ['controller', 'endpoint', 'viewsets', 'apiview', 'restcontroller', 'requestmapping', 'action'],
  'service': ['service', 'business', 'logic', 'usecase', 'interactor', 'serviceimpl', 'component'],
  'validation': ['validator', 'validation', 'schema', 'zod', 'yup', 'validators', 'forms', 'pydantic', 'validate', 'constraint', 'request', 'formrequest'],
  'jobs': ['worker', 'job', 'queue', 'bull', 'agenda', 'celery', 'tasks', 'scheduled', 'async', 'executor', 'sidekiq', 'activejob', 'delayed']
}

/** Titulos descritivos em portugues para cada feature semantica. Usados como category no card. */
const FEATURE_TITLES: Record<string, string> = {
  'auth': 'Autenticação e Login',
  'user': 'Gestão de Usuários',
  'payment': 'Pagamentos e Cobrança',
  'database': 'Acesso a Banco de Dados',
  'n8n': 'Automação e Workflows',
  'ai': 'Inteligência Artificial',
  'notification': 'Notificações e Emails',
  'card': 'Sistema de Cards',
  'project': 'Gestão de Projetos',
  'template': 'Templates e Layouts',
  'content': 'Gestão de Conteúdo',
  'admin': 'Painel Administrativo',
  'api': 'Clientes HTTP e APIs',
  'storage': 'Upload e Armazenamento',
  'middleware': 'Middlewares e Interceptors',
  'routing': 'Rotas e Navegação',
  'ui': 'Componentes de Interface',
  'docs': 'Documentação',
  'skill': 'Skills e Tutoriais',
  'utils': 'Funções Utilitárias',
  'config': 'Configuração do Projeto',
  'test': 'Testes Automatizados',
  'build': 'Build e Ferramentas',
  'style': 'Estilos e Temas',
  'hook': 'React Hooks',
  'controller': 'Endpoints e Controllers',
  'service': 'Lógica de Negócio',
  'validation': 'Validação de Dados',
  'jobs': 'Tarefas em Background'
}

/** Mapa de nomes de arquivo especificos de linguagem → categoria. */
const LANGUAGE_FILE_MAP: Record<string, string> = {
  'models.py': 'database', 'views.py': 'controller', 'serializers.py': 'database',
  'forms.py': 'validation', 'tasks.py': 'jobs', 'celery.py': 'jobs',
  'admin.py': 'admin', 'urls.py': 'routing'
}

/** Mapa de sufixos de arquivo por linguagem → categoria. */
const LANGUAGE_SUFFIX_MAP: [RegExp, string][] = [
  [/_handler\.go$/i, 'controller'], [/_service\.go$/i, 'service'],
  [/_repository\.go$/i, 'database'], [/_middleware\.go$/i, 'middleware'],
  [/Controller\.java$/i, 'controller'], [/Service\.java$/i, 'service'],
  [/Repository\.java$/i, 'database'], [/Entity\.java$/i, 'database'],
  [/DTO\.java$/i, 'api'],
  [/_controller\.rb$/i, 'controller'], [/_service\.rb$/i, 'service'],
  [/_job\.rb$/i, 'jobs'], [/_mailer\.rb$/i, 'notification']
]

/** Mapa de patterns de path → categoria. Avaliados na ordem. */
const PATH_PATTERN_MAP: [RegExp, string][] = [
  [/\/components\/ui\//i, 'ui'],
  [/\/skills\//i, 'skill'],
  [/\/docs\//i, 'docs'],
  [/readme\.md|contributing\.md|changelog\.md|license\.md/i, 'docs'],
  [/\.md$/i, 'docs'],
  [/\/utils\/|\/helpers\//i, 'utils'],
  [/\/hooks\//i, 'hook'],
  [/\/test|\.test\.|\.spec\.|__tests__|\.e2e\./i, 'test'],
  [/\.config\.|tsconfig|webpack|vite\.config|babel\.config|eslint/i, 'config'],
  [/package\.json|requirements\.txt|go\.mod|go\.sum|pom\.xml|build\.gradle|composer\.json|gemfile|pyproject\.toml|setup\.py|application\.properties|\.env|dockerfile|docker-compose|\.dockerignore|\.gitignore|\.prettierrc|\.editorconfig/i, 'config'],
  [/\.css$|\.scss$|\.sass$|\.less$|tailwind/i, 'style']
]

// ================================================
// DEPENDENCY GRAPH HELPERS
// ================================================

function extractImports(content: string): string[] {
  const imports: string[] = []
  const es6 = /import\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"]/g
  const req = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  const dyn = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  let m: RegExpExecArray | null
  while ((m = es6.exec(content)) !== null) imports.push(m[1]!)
  while ((m = req.exec(content)) !== null) imports.push(m[1]!)
  while ((m = dyn.exec(content)) !== null) imports.push(m[1]!)
  return imports
}

function buildDependencyGraph(files: Array<{ path: string; content: string }>): Map<string, Set<string>> {
  const index = new Map<string, string>()
  for (const f of files) {
    const noExt = f.path.replace(/\.(t|j)sx?$|\.vue$|\.svelte$|\.py$|\.go$|\.rb$|\.php$|\.java$/i, '')
    index.set(f.path, f.path)
    index.set(noExt, f.path)
  }

  const graph = new Map<string, Set<string>>()
  for (const f of files) {
    const deps = new Set<string>()
    for (const imp of extractImports(f.content)) {
      if (imp.startsWith('.')) {
        const base = f.path.split('/').slice(0, -1).join('/')
        const norm = (base ? base + '/' : '') + imp
          .replace(/\/\.\//g, '/')
          .replace(/\/[^/]+\/\.\.\//g, '/')
          .replace(/^\.\//, '')
        const resolved = index.get(norm) || index.get(norm.replace(/\.(t|j)sx?$/i, '')) || null
        if (resolved) deps.add(resolved)
      }
    }
    graph.set(f.path, deps)
  }
  return graph
}

function findConnectedComponents(graph: Map<string, Set<string>>): string[][] {
  const seen = new Set<string>()
  const out: string[][] = []

  const visit = (n: string, acc: string[]) => {
    if (seen.has(n)) return
    seen.add(n)
    acc.push(n)
    for (const to of graph.get(n) ?? []) {
      visit(to, acc)
    }
    for (const [k, set] of graph) {
      if (set.has(n)) visit(k, acc)
    }
  }

  for (const node of graph.keys()) {
    if (!seen.has(node)) {
      const comp: string[] = []
      visit(node, comp)
      if (comp.length) out.push(comp)
    }
  }
  return out
}

interface ParsedRepoInfo {
  owner: string
  repo: string
}

interface FileEntry {
  path: string
  content: string
  size: number
}

interface FeatureFile extends FileEntry {
  layer: string
  featureName: string
}

export class GithubService {

  private static parseGithubUrl(url: string): ParsedRepoInfo | null {
    try {
      const urlObj = new URL(url)
      if (urlObj.hostname !== 'github.com') return null
      const parts = urlObj.pathname.split('/').filter(Boolean)
      if (parts.length < 2) return null
      return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/i, '') }
    } catch {
      return null
    }
  }

  /** Monta headers para a API do GitHub.
   *  Suporta Classic PATs (ghp_) com prefixo 'token' e Fine-grained PATs (github_pat_) com 'Bearer'. */
  private static getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': '10xDev-App'
    }
    if (token) {
      const prefix = token.startsWith('github_pat_') ? 'Bearer' : 'token'
      headers.Authorization = `${prefix} ${token}`
    }
    return headers
  }

  static async validateToken(token: string): Promise<boolean> {
    if (!token) return false
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: this.getHeaders(token), timeout: 15000
      })
      return response.status === 200
    } catch {
      return false
    }
  }

  static async getRepoDetails(url: string, token?: string): Promise<GithubRepoInfo> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) throw new Error('URL do GitHub inválida. Use: https://github.com/usuario/repositorio')

    try {
      const { data } = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`,
        { headers: this.getHeaders(token), timeout: 15000 }
      )
      return {
        name: data.name,
        description: data.description,
        url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
        isPrivate: Boolean(data.private)
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; headers?: Record<string, string>; data?: { message?: string } }, message?: string }
      const status = axiosError.response?.status
      const msg = status === 404
        ? 'Repositório não encontrado. Verifique a URL.'
        : (status === 401 || status === 403)
          ? (axiosError.response?.headers?.['x-ratelimit-remaining'] === '0'
            ? 'Limite de requisições do GitHub atingido. Aguarde ou use um token.'
            : 'Sem permissão. Se for privado, adicione um token de acesso.')
          : `Erro ao acessar GitHub: ${axiosError.response?.data?.message || axiosError.message || String(error)}`
      const err = new Error(msg) as Error & { statusCode?: number }
      err.statusCode = status || 500
      throw err
    }
  }

  /** Baixa repositorio como ZIP. Tenta API com token (privados), depois URLs publicas. */
  private static async downloadRepoAsZip(url: string, token?: string): Promise<Buffer> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) throw new Error('URL do GitHub inválida')

    let defaultBranch = 'main'
    try {
      const resp = await axios.get(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`, {
        headers: this.getHeaders(token), timeout: 15000
      })
      defaultBranch = resp.data.default_branch || 'main'
    } catch {
      // Ignora erro, usa branches padrão
    }

    const branches = [...new Set([defaultBranch, 'main', 'master'])]

    // API download (repos privados com token)
    if (token) {
      for (const branch of branches) {
        try {
          const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/zipball/${branch}`
          const resp = await axios.get(apiUrl, {
            headers: this.getHeaders(token), responseType: 'arraybuffer', timeout: 600000, maxContentLength: 500 * 1024 * 1024
          })
          return Buffer.from(resp.data)
        } catch {
          continue
        }
      }
    }

    // Fallback: URLs publicas
    for (const branch of branches) {
      try {
        const publicUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/${branch}.zip`
        const resp = await axios.get(publicUrl, {
          headers: { 'User-Agent': '10xDev-App' }, responseType: 'arraybuffer', timeout: 600000, maxContentLength: 500 * 1024 * 1024
        })
        return Buffer.from(resp.data)
      } catch {
        continue
      }
    }

    throw new Error('Não foi possível baixar o repositório. Se for privado, informe um token.')
  }

  private static extractFilesFromZip(zipBuffer: Buffer): FileEntry[] {
    const zip = new AdmZip(zipBuffer)
    const entries = zip.getEntries()
    const files: FileEntry[] = []

    for (const entry of entries) {
      if (entry.isDirectory) continue
      const parts = entry.entryName.split('/')
      parts.shift()
      const relativePath = parts.join('/')
      if (!relativePath) continue
      if (!this.shouldIncludeFile(relativePath)) continue
      if (entry.header.size > MAX_FILE_SIZE) continue
      try {
        const content = entry.getData().toString('utf-8')
        files.push({ path: relativePath, content, size: entry.header.size })
      } catch { continue }
    }

    return files
  }

  // ================================================
  // FILE HELPERS
  // ================================================

  private static getFileExtension(path: string): string {
    const fileName = path.split('/').pop() || ''
    if (fileName.toLowerCase() === 'dockerfile') return '.dockerfile'
    if (fileName.startsWith('.env')) return '.env'
    const lastDot = path.lastIndexOf('.')
    if (lastDot === -1) return ''
    return path.substring(lastDot).toLowerCase()
  }

  private static getLanguageFromExtension(ext: string): string {
    return EXTENSION_TO_LANGUAGE[ext] || 'plaintext'
  }

  private static shouldIncludeFile(path: string): boolean {
    const parts = path.split('/')
    for (const part of parts) {
      if (IGNORED_DIRS.includes(part.toLowerCase())) return false
    }
    const fileName = parts[parts.length - 1] || ''
    if (IGNORED_FILES.includes(fileName)) return false
    return CODE_EXTENSIONS.includes(this.getFileExtension(path))
  }

  private static detectTech(files: FileEntry[], packageJson?: PackageJson): string {
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      for (const [keyword, tech] of Object.entries(TECH_DETECTION)) {
        for (const dep of Object.keys(deps || {})) {
          if (dep.toLowerCase().includes(keyword)) return tech
        }
      }
    }
    const paths = files.map(f => f.path)
    if (paths.some(f => f.includes('next.config'))) return 'Next.js'
    if (paths.some(f => f.endsWith('.vue'))) return 'Vue.js'
    if (paths.some(f => f.endsWith('.svelte'))) return 'Svelte'
    if (paths.some(f => f.endsWith('.tsx') || f.endsWith('.ts'))) return 'TypeScript'
    if (paths.some(f => f.endsWith('.py'))) return 'Python'
    if (paths.some(f => f.endsWith('.java'))) return 'Java'
    if (paths.some(f => f.endsWith('.go'))) return 'Go'
    return 'General'
  }

  private static detectMainLanguage(files: FileEntry[]): string {
    const langCounts = new Map<string, number>()

    for (const f of files) {
      const ext = f.path.substring(f.path.lastIndexOf('.')).toLowerCase()
      const lang = EXTENSION_TO_LANGUAGE[ext]
      if (lang) {
        langCounts.set(lang, (langCounts.get(lang) || 0) + 1)
      }
    }

    if (langCounts.size === 0) {
      return 'General'
    }

    const sorted = Array.from(langCounts.entries())
      .sort((a, b) => b[1] - a[1])

    const [topLang, topCount] = sorted[0]!
    const totalFiles = files.length
    const threshold = 0.3

    if (topCount < totalFiles * threshold && sorted.length > 1) {
      return 'General'
    }

    return topLang
  }

  // ================================================
  // FEATURE DETECTION & GROUPING
  // ================================================

  private static detectFileLayer(pathStr: string): string {
    const orderedLayers = [
      'routes', 'controllers', 'services', 'models',
      'middlewares', 'validators',
      'api',
      'hooks', 'components', 'pages', 'stores',
      'types', 'utils'
    ] as const
    for (const layer of orderedLayers) {
      const pattern = LAYER_PATTERNS[layer]
      if (pattern && pattern.test(pathStr)) return layer
    }
    return 'other'
  }

  /** Extrai nome da feature a partir do path do arquivo.
   *  Fluxo: language-specific → path patterns → dir structure → filename → normalize. */
  private static extractFeatureName(path: string): string {
    const pathLower = path.toLowerCase()
    const fileName = path.split('/').pop() || ''

    // 1. Nomes de arquivo especificos de linguagem (models.py, views.py, etc)
    const langMatch = LANGUAGE_FILE_MAP[fileName]
    if (langMatch) return langMatch

    // 2. Sufixos de arquivo por linguagem (_handler.go, Controller.java, etc)
    for (const [pattern, category] of LANGUAGE_SUFFIX_MAP) {
      if (pattern.test(fileName)) return category
    }

    // 3. Patterns de path (componentes/ui, hooks, utils, etc)
    for (const [pattern, category] of PATH_PATTERN_MAP) {
      if (pattern.test(pathLower)) return category
    }

    // 4. Arquivos .json genericos (exceto node_modules)
    if (pathLower.endsWith('.json') && !pathLower.includes('/node_modules/')) return 'config'

    // 5. Feature directories (src/features/auth/, src/modules/payments/)
    const parts = path.split('/')
    const featureDirs = ['features', 'modules', 'domains', 'apps']
    for (let i = 0; i < parts.length - 1; i++) {
      if (featureDirs.includes(parts[i]?.toLowerCase() || '')) {
        const featureDir = parts[i + 1]
        if (featureDir && !['src', 'lib', 'app'].includes(featureDir.toLowerCase())) {
          return this.normalizeFeatureName(featureDir)
        }
      }
    }

    // 6. Extrair do nome do arquivo
    let baseName = (parts.pop() || '')
      .replace(/\.(ts|tsx|js|jsx|py|java|go|rs|rb|php|vue|svelte)$/i, '')
      .replace(/\.(test|spec|stories|styles?|module)$/i, '')
      .replace(/^index$/i, '')

    // Se vazio, usar diretorio pai
    if (!baseName && parts.length > 0) baseName = parts[parts.length - 1] || 'misc'

    // 7. Remover sufixos comuns de arquitetura
    baseName = baseName.replace(
      /(Controller|Service|Model|Routes?|Router|Validator|Middleware|Hook|Component|Page|Store|Slice|Api|Utils?|Helper|Type|Interface|Schema|Dto|Entity|Repository|Handler|Provider|Factory|Manager)s?$/i,
      ''
    )

    // 8. Remover prefixo 'use' de hooks
    if (baseName.toLowerCase().startsWith('use')) baseName = baseName.substring(3)

    return this.normalizeFeatureName(baseName)
  }

  private static normalizeFeatureName(name: string): string {
    return name
      .replace(/([a-z])([A-Z])/g, '$1$2')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim()
  }

  private static mapToSemanticFeature(name: string): string {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    for (const [feature, keywords] of Object.entries(FEATURE_SEMANTIC_MAP)) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) return feature
      }
    }
    return normalized || 'misc'
  }

  private static groupFilesByFeature(files: FileEntry[]): Map<string, FeatureFile[]> {
    const prelim: FeatureFile[] = files.map(file => ({
      ...file,
      layer: this.detectFileLayer(file.path),
      featureName: this.extractFeatureName(file.path)
    }))

    const codeFiles = prelim.map(f => ({ path: f.path, content: f.content }))
    const graph = buildDependencyGraph(codeFiles)
    const components = findConnectedComponents(graph)

    const isGeneric = (ff: FeatureFile) =>
      ['utils', 'types', 'config'].includes(ff.featureName) ||
      ['utils', 'types'].includes(ff.layer)
    const pathToFeat = new Map(prelim.map(f => [f.path, f.featureName]))
    const importerCountByTarget = new Map<string, Map<string, string[]>>()

    for (const [importer, deps] of graph) {
      const importerFeat = pathToFeat.get(importer) || 'misc'
      for (const dep of deps) {
        const m = importerCountByTarget.get(dep) || new Map<string, string[]>()
        const arr = m.get(importerFeat) || []
        arr.push(importer)
        m.set(importerFeat, arr)
        importerCountByTarget.set(dep, m)
      }
    }

    const reassigned: FeatureFile[] = prelim.map(f => {
      if (!isGeneric(f)) return f
      const byFeat = importerCountByTarget.get(f.path)
      if (!byFeat || byFeat.size === 0) return f
      const top = Array.from(byFeat.entries()).sort((a, b) => b[1].length - a[1].length)[0]
      const candidate = top?.[0]
      if (candidate && candidate !== f.featureName) {
        return { ...f, featureName: candidate }
      }
      return f
    })

    const smallCluster = 6
    const inCluster = new Set<string>(components.flat())
    const pathToFeatFinal = new Map(reassigned.map(f => [f.path, f.featureName]))
    const finalSet = reassigned.map(f => {
      if (!inCluster.has(f.path)) return f
      const comp = components.find(c => c.includes(f.path))
      if (!comp || comp.length > smallCluster) return f
      const feats = comp.map(p => pathToFeatFinal.get(p) || 'misc')
      const top = feats.sort((a, b) =>
        feats.filter(x => x === b).length - feats.filter(x => x === a).length
      )[0]
      return { ...f, featureName: top || f.featureName }
    })

    const groups = new Map<string, FeatureFile[]>()
    for (const f of finalSet) {
      const key = f.featureName || 'misc'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(f)
    }
    return this.consolidateFeatures(groups)
  }

  /** Consolida grupos fragmentados mapeando nomes para features semanticas. */
  private static consolidateFeatures(groups: Map<string, FeatureFile[]>): Map<string, FeatureFile[]> {
    const consolidated = new Map<string, FeatureFile[]>()
    for (const [name, files] of groups) {
      const semantic = this.mapToSemanticFeature(name)
      if (!consolidated.has(semantic)) consolidated.set(semantic, [])
      consolidated.get(semantic)!.push(...files)
    }
    return consolidated
  }

  private static generateFeatureTitle(featureName: string, files: FeatureFile[]): string {
    const layers = new Set(files.map(f => f.layer))
    const hasBackend = ['routes', 'controllers', 'services', 'models'].some(l => layers.has(l))
    const hasFrontend = ['hooks', 'components', 'pages', 'stores'].some(l => layers.has(l))
    const title = FEATURE_TITLES[featureName] || this.capitalizeFirst(featureName)

    if (hasBackend && hasFrontend) return `Sistema de ${title}`
    if (hasBackend) return `API de ${title}`
    if (hasFrontend) return `Interface de ${title}`
    return title
  }

  private static generateFeatureDescription(featureName: string, files: FeatureFile[]): string {
    const layers = [...new Set(files.map(f => f.layer))].filter(l => l !== 'other')
    const cap = this.capitalizeFirst(featureName)

    const hasBackend = layers.some(l => ['controllers', 'services', 'routes'].includes(l))
    const hasFrontend = layers.some(l => ['components', 'pages', 'hooks'].includes(l))
    const prefix = hasBackend && hasFrontend ? 'Stack completo'
      : hasBackend ? 'Backend' : hasFrontend ? 'Frontend' : 'Módulo'

    // Detectar metodos HTTP nos arquivos de rotas
    const methods = new Set<string>()
    for (const file of files.filter(f => f.layer === 'routes')) {
      const c = file.content.toLowerCase()
      for (const m of ['get', 'post', 'put', 'delete', 'patch']) {
        if (c.includes(`.${m}(`)) methods.add(m.toUpperCase())
      }
    }

    const parts = [`${prefix} do módulo ${cap}`]
    if (methods.size > 0) parts.push(`com endpoints ${[...methods].join('/')}`)
    parts.push(`(${files.length} arquivos)`)
    return parts.join(' ')
  }

  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private static makeSnippet(content: string): string {
    return content.slice(0, 2000)
  }

  /** Cria ContentBlock a partir de um arquivo. */
  private static fileToBlock(file: FileEntry, order: number): ContentBlock {
    const ext = this.getFileExtension(file.path)
    return {
      id: randomUUID(),
      type: ContentType.CODE,
      content: file.content,
      language: this.getLanguageFromExtension(ext),
      title: file.path.split('/').pop() || file.path,
      route: file.path,
      order
    }
  }

  /** Monta CreateCardFeatureRequest com valores padrao. */
  private static buildCard(
    featureName: string,
    screens: CardFeatureScreen[],
    tech: string,
    lang: string,
    featureFiles: FeatureFile[],
    aiOverrides?: { title: string; description?: string | undefined; tech?: string | undefined; language?: string | undefined; category?: string; tags?: string[] }
  ): CreateCardFeatureRequest {
    const category = aiOverrides?.category || FEATURE_TITLES[featureName] || this.capitalizeFirst(featureName)
    return {
      title: aiOverrides ? cleanMarkdown(aiOverrides.title) : this.generateFeatureTitle(featureName, featureFiles),
      description: cleanMarkdown(aiOverrides?.description || this.generateFeatureDescription(featureName, featureFiles)),
      tech: aiOverrides?.tech || tech,
      language: aiOverrides?.language || lang,
      content_type: ContentType.CODE,
      card_type: CardType.CODIGOS,
      category,
      tags: aiOverrides?.tags || this.generateAutoTags(featureName, tech),
      visibility: Visibility.UNLISTED,
      screens
    }
  }

  private static addSummaryScreen(card: CreateCardFeatureRequest): CreateCardFeatureRequest {
    const allFiles = card.screens
      .flatMap(s => s.blocks
        .filter(b => b.route && b.type === ContentType.CODE)
        .map(b => b.route!)
      )
      .filter(Boolean)
      .filter(f => {
        const excludePatterns = ['.md', '.claude/', '.clinerules/', '.cursor/', '.github/']
        return !excludePatterns.some(p => f.includes(p))
      })
    const summaryBlock: ContentBlock = {
      id: randomUUID(),
      type: ContentType.TEXT,
      content: `${card.description}\n\nArquivos (${allFiles.length}):\n${allFiles.map(f => f.split('/').pop()).join(', ')}`,
      order: 0
    }
    const summaryScreen: CardFeatureScreen = {
      name: 'Resumo',
      description: card.description,
      route: '',
      blocks: [summaryBlock]
    }
    return {
      ...card,
      screens: [summaryScreen, ...card.screens]
    }
  }

  /** Gera tags automaticas baseadas na feature e tech.
   *  Usa FEATURE_TITLES (portugues) ao inves de keywords cruas para evitar
   *  duplicatas como "Project"/"Projeto" ou "Card"/"CardFeature". */
  private static generateAutoTags(featureName: string, tech: string): string[] {
    const tags: string[] = []

    // 1. Nome da feature em portugues (via FEATURE_TITLES) como tag principal
    const featureTitle = FEATURE_TITLES[featureName]
    if (featureTitle) {
      tags.push(featureTitle)
    } else if (featureName && featureName !== 'misc') {
      // Feature desconhecida: normalizar ao inves de usar key crua
      tags.push(normalizeTag(featureName))
    }

    // 2. Tech principal (manter case original: "React", "Node.js")
    if (tech && tech !== 'General') {
      tags.push(tech)
    }

    return [...new Set(tags)].filter(t => t.length > 2)
  }

  private static estimateCardsCount(featureGroups: [string, FeatureFile[]][]): number {
    const byFeature = featureGroups.length
    const totalFiles = featureGroups.reduce((sum, [, files]) => sum + files.length, 0)
    const totalSize = featureGroups.reduce((sum, [, files]) => sum + files.reduce((s, f) => s + f.size, 0), 0)
    return Math.max(byFeature, Math.ceil(totalFiles / 5), Math.ceil(totalSize / (50 * 1024)), 10)
  }

  // ================================================
  // MAIN PROCESSING
  // ================================================

  static async processRepoToCards(
    url: string,
    token?: string,
    options?: {
      useAi?: boolean
      onProgress?: (update: { step: string; progress?: number; message?: string; cardEstimate?: number; cardCount?: number }) => void
      onCardReady?: (card: CreateCardFeatureRequest) => Promise<void>
    }
  ): Promise<{ cards: CreateCardFeatureRequest[]; filesProcessed: number; aiUsed: boolean; aiCardsCreated: number }> {
    const notify = (step: string, progress: number, message: string, extra?: { cardEstimate?: number; cardCount?: number }) =>
      options?.onProgress?.({ step, progress, message, ...extra })

    notify('downloading_zip', 5, 'Baixando o repositório do GitHub...')
    const zipBuffer = await this.downloadRepoAsZip(url, token)

    const files = this.extractFilesFromZip(zipBuffer)
    if (files.length === 0) throw new Error('Nenhum arquivo de código encontrado no repositório.')

    const totalFiles = files.length
    let filesProcessed = 0

    notify('extracting_files', 10, `Extraindo ${totalFiles} arquivos...`)

    let packageJson: PackageJson | undefined
    const pkg = files.find(f => f.path === 'package.json')
    if (pkg) { try { packageJson = JSON.parse(pkg.content) } catch { /* ignore */ } }

    const tech = this.detectTech(files, packageJson)
    const mainLanguage = this.detectMainLanguage(files)

    notify('analyzing_repo', 20, `Tecnologia: ${tech}. Mapeando funcionalidades...`)
    const featureGroups = this.groupFilesByFeature(files)

    const notifyProgress = (step: string, progress: number, message: string) => {
      options?.onProgress?.({ step, progress, message })
    }

    const pushQualityLog = (step: string, progress: number) => (message: string) => {
      const normalized = message.replace(/\s+/g, ' ').trim()
      if (!normalized) return
      notify(step, progress, normalized, { cardEstimate: estimatedCards, cardCount: cards.length })
    }

    const useAi = options?.useAi === true && AiCardGroupingService.isEnabled() && AiCardGroupingService.hasConfig()

    let cards: CreateCardFeatureRequest[] = []
    let aiCardsCreated = 0

    const featureGroupsArray = Array.from(featureGroups.entries())
    const totalFeatures = featureGroupsArray.length
    const estimatedCards = this.estimateCardsCount(featureGroupsArray)

    /** Emite card para o array e chama onCardReady se disponivel. */
    const emitCard = async (card: CreateCardFeatureRequest) => {
      cards.push(card)
      if (options?.onCardReady) {
        try { await options.onCardReady(card) }
        catch (err) { console.error(`Erro ao criar card "${card.title}":`, err) }
      }
    }

    // ================================================
    // AI PATH: Chamar IA 1x com todos os arquivos ANTES do loop
    // ================================================
    if (useAi) {
      notify('generating_cards', 55,
        `🤖 IA analisando todo o repositório [1/1]`,
        { cardEstimate: estimatedCards })
      try {
        const mode = AiCardGroupingService.mode()
        const allFeatureFiles = featureGroupsArray.flatMap(([, files]) => files)
        const fileMetas = allFeatureFiles.map(f => ({
          path: f.path,
          layer: f.layer,
          featureName: f.featureName,
          size: f.size,
          snippet: mode === 'full' ? f.content : this.makeSnippet(f.content)
        }))
        const ai = await AiCardGroupingService.refineGrouping({
          repoUrl: url,
          detectedTech: tech,
          detectedLanguage: mainLanguage,
          files: fileMetas,
          proposedGroups: featureGroupsArray.map(([key, files]) => ({
            key,
            files: files.map(f => f.path)
          }))
        })
        notify('generating_cards', 65,
          `✅ IA criou ${ai.cards.length} card(s) consolidados`,
          { cardEstimate: estimatedCards, cardCount: ai.cards.length })
        for (const aiCard of ai.cards) {
          const screens: CardFeatureScreen[] = []
          for (const s of aiCard.screens) {
            const blocks: ContentBlock[] = []
            for (const filePath of s.files) {
              const file = allFeatureFiles.find(ff => ff.path === filePath)
              if (!file) continue
              blocks.push(this.fileToBlock(file, blocks.length))
              filesProcessed++
            }
            if (blocks.length === 0) continue
            screens.push({
              name: s.name,
              description: cleanMarkdown(s.description || ''),
              route: s.files[0] || '',
              blocks
            })
          }
          if (screens.length === 0) continue
          const aiOverrides: { title: string; description?: string | undefined; tech?: string | undefined; language?: string | undefined; category?: string; tags?: string[] } = {
            title: aiCard.title,
            description: aiCard.description,
            tech: aiCard.tech,
            language: aiCard.language,
            category: aiCard.category
          }
          if (aiCard.tags && aiCard.tags.length > 0) aiOverrides.tags = aiCard.tags
          const newCard = this.buildCard(aiCard.title.toLowerCase().replace(/\s+/g, ''), screens, tech, mainLanguage, allFeatureFiles, aiOverrides)
          // Se a IA forneceu tags, normalizar para evitar duplicatas EN/PT
          if (aiCard.tags && aiCard.tags.length > 0) {
            newCard.tags = normalizeTags(aiCard.tags)
          }
          const cardWithSummary = this.addSummaryScreen(newCard)
          await emitCard(cardWithSummary)
          aiCardsCreated++
          if (totalFiles > 0) {
            const progress = Math.floor(30 + (filesProcessed / totalFiles) * 55)
            notifyProgress('generating_cards', progress, `${filesProcessed}/${totalFiles} arquivos processados`)
          }
        }
        // Após processar todos os cards da IA, adicionar Sumário e retornar
        cards.sort((a, b) => (b.screens?.length || 0) - (a.screens?.length || 0))
        // Qualidade check
        notify('quality_check', 80, '🔍 Supervisor de qualidade analisando cards...', { cardEstimate: estimatedCards, cardCount: cards.length })
        const qualityReport = CardQualitySupervisor.analyzeQuality(cards, {
          onLog: pushQualityLog('quality_check', 82)
        })
        if (qualityReport.issuesFound > 0) {
          notify('quality_corrections', 85, '🔧 Aplicando correções automáticas...', { cardEstimate: estimatedCards, cardCount: cards.length })
          const corrections = CardQualitySupervisor.applyCorrections(cards, qualityReport, {
            onLog: pushQualityLog('quality_corrections', 88)
          })
          cards = corrections.correctedCards
          notify('quality_corrections', 90, `✅ Correções: ${corrections.mergesApplied} merge(s), ${corrections.cardsRemoved} remoção(ões)`, { cardEstimate: estimatedCards, cardCount: cards.length })
        } else {
          notify('quality_check', 90, '✅ Supervisor: qualidade OK', { cardEstimate: estimatedCards, cardCount: cards.length })
        }
        const aiSummary = aiCardsCreated > 0
          ? `🤖 IA criou ${aiCardsCreated} cards de ${cards.length} totais`
          : `📁 ${cards.length} cards criados via heurística`
        notify('generating_cards', 90, `${aiSummary} (${filesProcessed} arquivos)`, { cardEstimate: estimatedCards, cardCount: cards.length })
        return { cards, filesProcessed, aiUsed: true, aiCardsCreated }
      } catch (featureErr: unknown) {
        console.error('[GithubService] Erro IA no processamento único:', featureErr instanceof Error ? featureErr.message : String(featureErr))
        notify('generating_cards', 60,
          `⚠️ IA falhou, usando heurística`,
          { cardEstimate: estimatedCards })
        // Fallback: continua para o caminho heurístico
      }
    }
    // ================================================

    for (const [idx, [featureName, featureFiles]] of featureGroupsArray.entries()) {
      const featureProgress = 55 + Math.floor(((idx + 1) / totalFeatures) * 15)

      // --- Heuristic path ---
      notify('generating_cards', featureProgress,
        `📁 Organizando: ${featureName} (${featureFiles.length} arquivos) [${idx + 1}/${totalFeatures}]`,
        { cardEstimate: estimatedCards })

      const filesByLayer = new Map<string, FeatureFile[]>()
      for (const file of featureFiles) {
        if (!filesByLayer.has(file.layer)) filesByLayer.set(file.layer, [])
        filesByLayer.get(file.layer)!.push(file)
      }

      const screens: CardFeatureScreen[] = []
      const layerOrder = ['routes', 'controllers', 'services', 'models', 'middlewares', 'validators', 'hooks', 'api', 'stores', 'components', 'pages', 'types', 'utils', 'other']

      for (const layer of layerOrder) {
        const layerFiles = filesByLayer.get(layer)
        if (!layerFiles?.length) continue

        const screenName = LAYER_TO_SCREEN_NAME[layer] || this.capitalizeFirst(layer)
        const blocks: ContentBlock[] = []
        for (const file of layerFiles) {
          blocks.push(this.fileToBlock(file, blocks.length))
          filesProcessed++
        }
        const fileNames = layerFiles.map(f => f.path.split('/').pop()).join(', ')
        screens.push({
          name: screenName,
          description: layerFiles.length === 1 ? `Arquivo ${fileNames}` : `Arquivos: ${fileNames}`,
          route: layerFiles[0]?.path || '',
          blocks
        })
      }

      if (!screens.length) continue
      const newCard = this.buildCard(featureName, screens, tech, mainLanguage, featureFiles)
      const cardWithSummary = this.addSummaryScreen(newCard)
      await emitCard(cardWithSummary)
    }

    cards.sort((a, b) => (b.screens?.length || 0) - (a.screens?.length || 0))

    const aiSummary = aiCardsCreated > 0
      ? `🤖 IA criou ${aiCardsCreated} cards de ${cards.length} totais`
      : `📁 ${cards.length} cards criados via heurística`
    notify('generating_cards', 70, `${aiSummary} (${filesProcessed} arquivos)`, { cardEstimate: estimatedCards, cardCount: cards.length })

    // Supervisor de qualidade
    notify('quality_check', 80, '🔍 Supervisor de qualidade analisando cards...', { cardEstimate: estimatedCards, cardCount: cards.length })
    const qualityReport = CardQualitySupervisor.analyzeQuality(cards, {
      onLog: pushQualityLog('quality_check', 82)
    })

    if (qualityReport.issuesFound > 0) {
      notify('quality_corrections', 85, '🔧 Aplicando correções automáticas...', { cardEstimate: estimatedCards, cardCount: cards.length })
      const corrections = CardQualitySupervisor.applyCorrections(cards, qualityReport, {
        onLog: pushQualityLog('quality_corrections', 88)
      })
      cards = corrections.correctedCards
      notify('quality_corrections', 90, `✅ Correções: ${corrections.mergesApplied} merge(s), ${corrections.cardsRemoved} remoção(ões)`, { cardEstimate: estimatedCards, cardCount: cards.length })
    } else {
      notify('quality_check', 90, '✅ Supervisor: qualidade OK', { cardEstimate: estimatedCards, cardCount: cards.length })
    }

    return { cards, filesProcessed, aiUsed: aiCardsCreated > 0, aiCardsCreated }
  }

  // ================================================
  // GITHUB APP - Authentication & API
  // ================================================

  /** Gera JWT assinado com a private key do GitHub App.
    *  Valido por 10 minutos. Usado para obter installation tokens. */
  static generateAppJWT(): string {
    const appId = process.env.GITHUB_APP_ID
    const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH

    if (!appId || !privateKeyPath) {
      throw new Error('GITHUB_APP_ID e GITHUB_PRIVATE_KEY_PATH devem estar configurados no .env')
    }

    const resolvedPath = path.resolve(process.cwd(), privateKeyPath)
    const privateKey = fs.readFileSync(resolvedPath, 'utf8')

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iat: now - 60, // Issued at (60s no passado para clock drift)
      exp: now + (10 * 60), // Expira em 10 minutos
      iss: appId
    }

    return jwt.sign(payload, privateKey, { algorithm: 'RS256' })
  }

  /** Obtém um installation access token para um installation_id.
   *  Valido por 1 hora. Permite operacoes no repo. */
  static async getInstallationToken(installationId: number): Promise<string> {
    const jwt = this.generateAppJWT()

    const response = await axios.post(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )

    return response.data.token
  }

  /** Lista repositorios que o App tem acesso via installation_id */
  static async listInstallationRepos(installationId: number): Promise<unknown[]> {
    const token = await this.getInstallationToken(installationId)

    const repos: unknown[] = []
    let page = 1
    const perPage = 100
    let hasMore = true

    while (hasMore) {
      const response = await axios.get(
        'https://api.github.com/installation/repositories',
        {
          params: { per_page: perPage, page },
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      )

      const data = response.data
      repos.push(...(data.repositories || []))

      if ((data.repositories || []).length < perPage || repos.length >= data.total_count) {
        hasMore = false
      } else {
        page++
      }
    }

    return repos.map(r => ({
      id: (r as { id?: number }).id || 0,
      name: (r as { name?: string }).name || '',
      full_name: (r as { full_name?: string }).full_name || '',
      description: (r as { description?: string }).description || '',
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

  /** Obtem SHA do ultimo commit de uma branch */
  static async getLatestCommitSha(
    token: string, owner: string, repo: string, branch: string
  ): Promise<string> {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      { headers: this.getHeaders(token) }
    )
    return response.data.object.sha
  }

  /** Obtem conteudo de um arquivo do repo */
  static async getFileContent(
    token: string, owner: string, repo: string, filePath: string, ref?: string
  ): Promise<{ content: string; sha: string }> {
    const params: Record<string, string> = {}
    if (ref) params.ref = ref

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { headers: this.getHeaders(token), params }
    )

    const content = Buffer.from(response.data.content, 'base64').toString('utf8')
    return { content, sha: response.data.sha }
  }

  /** Lista arquivos alterados entre dois commits */
  static async getCommitDiff(
    token: string, owner: string, repo: string, baseSha: string, headSha: string
  ): Promise<Array<{ filename: string; status: string; additions: number; deletions: number }>> {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`,
      { headers: this.getHeaders(token) }
    )

    return (response.data.files || []).map((f: unknown) => ({
      filename: (f as { filename?: string }).filename || '',
      status: (f as { status?: string }).status || 'unknown',
      additions: (f as { additions?: number }).additions || 0,
      deletions: (f as { deletions?: number }).deletions || 0
    }))
  }

  /** Cria uma branch a partir de um SHA */
  static async createBranch(
    token: string, owner: string, repo: string, branchName: string, fromSha: string
  ): Promise<void> {
    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      { ref: `refs/heads/${branchName}`, sha: fromSha },
      { headers: this.getHeaders(token) }
    )
  }

  /** Atualiza (ou cria) conteudo de um arquivo no repo */
  static async updateFileContent(
    token: string, owner: string, repo: string,
    filePath: string, content: string, message: string, fileSha: string, branch: string
  ): Promise<{ sha: string }> {
    const encoded = Buffer.from(content, 'utf8').toString('base64')

    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { message, content: encoded, sha: fileSha, branch },
      { headers: this.getHeaders(token) }
    )

    return { sha: response.data.content.sha }
  }

  /** Cria um Pull Request */
  static async createPullRequest(
    token: string, owner: string, repo: string,
    options: { title: string; head: string; base: string; body: string }
  ): Promise<{ number: number; url: string; html_url: string }> {
    const response = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        title: options.title,
        head: options.head,
        base: options.base,
        body: options.body
      },
      { headers: this.getHeaders(token) }
    )

    return {
      number: response.data.number,
      url: response.data.url,
      html_url: response.data.html_url
    }
  }

  /** Troca authorization code por user access token (OAuth do GitHub App) */
  static async exchangeCodeForToken(code: string): Promise<{
    access_token: string
    token_type: string
    scope: string
  }> {
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET devem estar configurados no .env')
    }

    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code
      },
      {
        headers: { Accept: 'application/json' }
      }
    )

    if (response.data.error) {
      throw new Error(`GitHub OAuth error: ${response.data.error_description || response.data.error}`)
    }

    return response.data
  }

  /** Busca installations do usuario autenticado via user access token */
  static async getUserInstallations(userAccessToken: string): Promise<Array<{
    id: number
    account: { login: string; avatar_url: string }
    app_id: number
  }>> {
    const response = await axios.get(
      'https://api.github.com/user/installations',
      {
        headers: {
          Authorization: `token ${userAccessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )

    return response.data.installations || []
  }

  /** Verifica assinatura HMAC SHA-256 do webhook do GitHub */
  static verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    const secret = process.env.GITHUB_WEBHOOK_SECRET

    if (!secret) {
      console.error('GITHUB_WEBHOOK_SECRET não configurado')
      return false
    }

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }
}
