import axios from 'axios'
import AdmZip from 'adm-zip'
import { randomUUID } from 'crypto'
import type { GithubRepoInfo } from '@/types/project'
import { CardType, ContentType, Visibility } from '@/types/cardfeature'
import type { CardFeatureScreen, ContentBlock, CreateCardFeatureRequest } from '@/types/cardfeature'
import { AiCardGroupingService } from '@/services/aiCardGroupingService'
import { CardQualitySupervisor } from '@/services/cardQualitySupervisor'

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
 *  Usado para agrupar arquivos em "screens" (Backend - Controller, Frontend - Hook, etc). */
const LAYER_PATTERNS: Record<string, RegExp> = {
  routes: /\/(routes?|routers?)\//i,
  controllers: /\/(controllers?)\//i,
  services: /\/(services?)\//i,
  models: /\/(models?)\//i,
  middlewares: /\/(middlewares?)\//i,
  validators: /\/(validators?|validations?)\//i,
  hooks: /\/(hooks?)\//i,
  components: /\/(components?)\//i,
  pages: /\/(pages?|app)\//i,
  stores: /\/(stores?|state)\//i,
  api: /\/(api|services?)\//i,
  utils: /\/(utils?|helpers?|lib)\//i,
  types: /\/(types?|interfaces?)\//i
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
    } catch (error: any) {
      const status = error.response?.status
      const msg = status === 404
        ? 'Repositório não encontrado. Verifique a URL.'
        : (status === 401 || status === 403)
          ? (error.response?.headers?.['x-ratelimit-remaining'] === '0'
            ? 'Limite de requisições do GitHub atingido. Aguarde ou use um token.'
            : 'Sem permissão. Se for privado, adicione um token de acesso.')
          : `Erro ao acessar GitHub: ${error.response?.data?.message || error.message}`
      const err = new Error(msg) as any
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

  private static detectTech(files: FileEntry[], packageJson?: any): string {
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
    const counts: Record<string, number> = {}
    for (const file of files) {
      const lang = this.getLanguageFromExtension(this.getFileExtension(file.path))
      counts[lang] = (counts[lang] || 0) + 1
    }
    const preferred = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'ruby', 'php']
    let max = 0
    let winner = 'typescript'
    for (const lang of preferred) {
      if ((counts[lang] || 0) > max) {
        max = counts[lang] || 0
        winner = lang
      }
    }
    return winner
  }

  // ================================================
  // FEATURE DETECTION & GROUPING
  // ================================================

  private static detectFileLayer(path: string): string {
    for (const [layer, pattern] of Object.entries(LAYER_PATTERNS)) {
      if (pattern.test(path)) return layer
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
    const analyzed: FeatureFile[] = files.map(file => ({
      ...file,
      layer: this.detectFileLayer(file.path),
      featureName: this.extractFeatureName(file.path)
    }))

    const groups = new Map<string, FeatureFile[]>()
    for (const file of analyzed) {
      const key = file.featureName || 'misc'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(file)
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
    return content.slice(0, 1200)
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
    aiOverrides?: { title: string; description?: string | undefined; tech?: string | undefined; language?: string | undefined }
  ): CreateCardFeatureRequest {
    const category = FEATURE_TITLES[featureName] || this.capitalizeFirst(featureName)
    return {
      title: aiOverrides ? cleanMarkdown(aiOverrides.title) : this.generateFeatureTitle(featureName, featureFiles),
      description: cleanMarkdown(aiOverrides?.description || this.generateFeatureDescription(featureName, featureFiles)),
      tech: aiOverrides?.tech || tech,
      language: aiOverrides?.language || lang,
      content_type: ContentType.CODE,
      card_type: CardType.CODIGOS,
      category,
      tags: this.generateAutoTags(featureName, tech),
      visibility: Visibility.UNLISTED,
      screens
    }
  }

  private static addSummaryScreen(card: CreateCardFeatureRequest): CreateCardFeatureRequest {
    const allFiles = card.screens
      .flatMap(s => s.blocks.filter(b => b.route).map(b => b.route!))
      .filter(Boolean)
    const summaryBlock: ContentBlock = {
      id: randomUUID(),
      type: ContentType.TEXT,
      content: `## ${card.title}\n\n${card.description}\n\n### Arquivos (${allFiles.length})\n${allFiles.map(f => `- \`${f}\``).join('\n')}`,
      order: 0
    }
    const summaryScreen: CardFeatureScreen = {
      name: 'Sumário',
      description: card.description,
      route: '',
      blocks: [summaryBlock]
    }
    return {
      ...card,
      screens: [summaryScreen, ...card.screens]
    }
  }

  /** Gera tags automaticas baseadas na feature e tech. */
  private static generateAutoTags(featureName: string, tech: string): string[] {
    const tags: string[] = []
    if (featureName && featureName !== 'misc') tags.push(featureName)
    const keywords = FEATURE_SEMANTIC_MAP[featureName]
    if (keywords) tags.push(...keywords.slice(0, 3))
    if (tech && tech !== 'General') tags.push(tech.toLowerCase().replace(/\./g, ''))
    return [...new Set(tags)].filter(t => t.length > 2)
  }

  private static estimateCardsCount(featureGroups: [string, FeatureFile[]][]): number {
    const byFeature = featureGroups.length
    const totalFiles = featureGroups.reduce((sum, [_, files]) => sum + files.length, 0)
    const totalSize = featureGroups.reduce((sum, [_, files]) => sum + files.reduce((s, f) => s + f.size, 0), 0)
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

    let packageJson: any = null
    const pkg = files.find(f => f.path === 'package.json')
    if (pkg) { try { packageJson = JSON.parse(pkg.content) } catch { /* ignore */ } }

    const tech = this.detectTech(files, packageJson)
    const mainLanguage = this.detectMainLanguage(files)

    notify('analyzing_repo', 20, `Tecnologia: ${tech}. Mapeando funcionalidades...`)
    const featureGroups = this.groupFilesByFeature(files)

    const notifyProgress = (step: string, progress: number, message: string) => {
      options?.onProgress?.({ step, progress, message })
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
          const newCard = this.buildCard(aiCard.title.toLowerCase().replace(/\s+/g, ''), screens, tech, mainLanguage, allFeatureFiles, {
            title: aiCard.title,
            description: aiCard.description,
            tech: aiCard.tech,
            language: aiCard.language
          })
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
        const qualityReport = CardQualitySupervisor.analyzeQuality(cards)
        if (qualityReport.issuesFound > 0) {
          notify('quality_corrections', 85, '🔧 Aplicando correções automáticas...', { cardEstimate: estimatedCards, cardCount: cards.length })
          const corrections = CardQualitySupervisor.applyCorrections(cards, qualityReport)
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
      } catch (featureErr: any) {
        console.error('[GithubService] Erro IA no processamento único:', featureErr?.message)
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
    const qualityReport = CardQualitySupervisor.analyzeQuality(cards)

    if (qualityReport.issuesFound > 0) {
      notify('quality_corrections', 85, '🔧 Aplicando correções automáticas...', { cardEstimate: estimatedCards, cardCount: cards.length })
      const corrections = CardQualitySupervisor.applyCorrections(cards, qualityReport)
      cards = corrections.correctedCards
      notify('quality_corrections', 90, `✅ Correções: ${corrections.mergesApplied} merge(s), ${corrections.cardsRemoved} remoção(ões)`, { cardEstimate: estimatedCards, cardCount: cards.length })
    } else {
      notify('quality_check', 90, '✅ Supervisor: qualidade OK', { cardEstimate: estimatedCards, cardCount: cards.length })
    }

    return { cards, filesProcessed, aiUsed: aiCardsCreated > 0, aiCardsCreated }
  }
}
