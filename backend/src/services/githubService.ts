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

const TECH_DETECTION: Record<string, string> = {
  react: 'React',
  next: 'Next.js',
  vue: 'Vue.js',
  angular: 'Angular',
  svelte: 'Svelte',
  express: 'Express',
  fastify: 'Fastify',
  nest: 'NestJS',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI'
}

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

/**
 * Remove formatação Markdown de texto (negrito, itálico, links, etc)
 */
function cleanMarkdown(text: string): string {
  if (!text) return text

  return text
    // Remove **negrito**
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove *itálico*
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove __sublinhado__
    .replace(/__([^_]+)__/g, '$1')
    // Remove ~~riscado~~
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove `código inline`
    .replace(/`([^`]+)`/g, '$1')
    // Remove # Headers (##, ###, etc) - apenas no início da linha
    .replace(/^#{1,6}\s+/gm, '')
    // Remove links [texto](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points (-, *, +) no início da linha
    .replace(/^\s*[-*+]\s+/gm, '')
    .trim()
}

const LAYER_TO_SCREEN_NAME: Record<string, string> = {
  routes: 'Backend - Routes',
  controllers: 'Backend - Controller',
  services: 'Backend - Service',
  models: 'Backend - Model',
  middlewares: 'Backend - Middleware',
  validators: 'Backend - Validators',
  hooks: 'Frontend - Hook',
  components: 'Frontend - Component',
  pages: 'Frontend - Page',
  stores: 'Frontend - Store',
  api: 'Frontend - API Service',
  utils: 'Utils',
  types: 'Types',
  other: 'Other'
}

// Mapeamento semântico: feature → keywords que pertencem a ela
const FEATURE_SEMANTIC_MAP: Record<string, string[]> = {
  'auth': ['auth', 'login', 'logout', 'register', 'signup', 'signin', 'password', 'session', 'token', 'jwt', 'oauth', 'credential', 'authentication'],
  'user': ['user', 'profile', 'account', 'avatar', 'preferences', 'member'],
  'payment': ['payment', 'billing', 'checkout', 'stripe', 'invoice', 'subscription', 'pricing'],
  'database': [
    'supabase', 'database', 'db', 'prisma', 'drizzle', 'postgres', 'mysql', 'mongo', 'migration',
    // Python/Django
    'serializers', 'orm', 'querysets',
    // Go
    'repository', 'entity', 'gorm',
    // Java/Spring
    'jpa', 'hibernate',
    // Rails
    'activerecord'
  ],
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
  'middleware': [
    // Node.js/Express
    'middleware', 'cors', 'error', 'ratelimit', 'ratelimiter', 'limiter',
    // Django/Flask
    'decorators', 'beforerequest', 'afterrequest',
    // Go
    'interceptor',
    // Java/Spring
    'filter', 'aspect',
    // Rails
    'concern', 'rack'
  ],
  'routing': ['route', 'router', 'routing', 'protected', 'protectedroute', 'guard'],
  'ui': ['button', 'input', 'select', 'dialog', 'modal', 'dropdown', 'tooltip', 'badge', 'avatar', 'table', 'form', 'checkbox', 'radio', 'switch', 'slider', 'collapsible', 'accordion', 'tabs', 'sheet', 'popover', 'scroll', 'separator', 'label', 'textarea', 'calendar', 'command', 'context', 'hover', 'menubar', 'navigation', 'progress', 'skeleton', 'sonner', 'toast', 'alert', 'drawer', 'aspectratio', 'breadcrumb', 'carousel', 'chart', 'combobox', 'datepicker', 'resizable', 'toggle', 'togglegroup', 'layout', 'loading', 'app', 'sidebar', 'appsidebar'],
  'docs': ['readme', 'documentation', 'docs', 'guide', 'tutorial', 'changelog', 'contributing', 'license', 'roadmap', 'architecture', 'design'],
  'skill': ['skill', 'skills'],
  'utils': ['util', 'utils', 'helper', 'helpers', 'lib', 'libs', 'common', 'shared', 'constants', 'types'],
  'config': ['config', 'configuration', 'settings', 'env', 'environment', 'setup', 'initialize', 'server'],
  'test': ['test', 'tests', 'spec', 'testing', '__tests__', 'e2e', 'integration', 'unit', 'mock', 'fixture'],
  'build': ['build', 'webpack', 'vite', 'rollup', 'esbuild', 'tsconfig', 'babel', 'eslint', 'prettier', 'lint', 'format'],
  'style': ['css', 'scss', 'sass', 'less', 'style', 'styles', 'tailwind', 'theme', 'colors'],
  'hook': ['hook', 'hooks'],
  'controller': [
    // Node.js/Express
    'controller', 'endpoint',
    // Python
    'viewsets', 'apiview',
    // Java/Spring
    'restcontroller', 'requestmapping',
    // Rails
    'action'
  ],
  'service': [
    // Node.js
    'service', 'business', 'logic',
    // Python
    'usecase', 'interactor',
    // Java/Spring
    'serviceimpl', 'component'
  ],
  'validation': [
    // Node.js
    'validator', 'validation', 'schema', 'zod', 'yup',
    // Python
    'validators', 'forms', 'pydantic',
    // Go
    'validate',
    // Java/Spring
    'constraint',
    // PHP/Laravel
    'request', 'formrequest'
  ],
  'jobs': [
    // Node.js
    'worker', 'job', 'queue', 'bull', 'agenda',
    // Python
    'celery', 'tasks',
    // Java
    'scheduled', 'async', 'executor',
    // Rails
    'sidekiq', 'activejob', 'delayed'
  ]
}

// Títulos amigáveis em português
const FEATURE_TITLES: Record<string, string> = {
  'auth': 'Autenticação',
  'user': 'Usuários',
  'payment': 'Pagamentos',
  'database': 'Banco de Dados',
  'n8n': 'Workflows n8n',
  'ai': 'Inteligência Artificial',
  'notification': 'Notificações',
  'card': 'Cards',
  'project': 'Projetos',
  'template': 'Templates',
  'content': 'Conteúdo',
  'admin': 'Administração',
  'api': 'Cliente de API',
  'storage': 'Armazenamento',
  'middleware': 'Middlewares',
  'routing': 'Roteamento',
  'ui': 'Componentes UI',
  'docs': 'Documentação',
  'skill': 'Skills n8n',
  'utils': 'Utilitários',
  'config': 'Configuração',
  'test': 'Testes',
  'build': 'Build & Tooling',
  'style': 'Estilos',
  'hook': 'Hooks Customizados',
  'controller': 'Controllers',
  'service': 'Serviços de Negócio',
  'validation': 'Validações',
  'jobs': 'Jobs e Tasks Assíncronas'
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
  // ================================================
  // URL PARSING
  // ================================================

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

  // ================================================
  // TOKEN VALIDATION
  // ================================================

  static async validateToken(token: string): Promise<boolean> {
    if (!token) return false
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: this.getHeaders(token),
        timeout: 15000
      })
      return response.status === 200
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false
      }
      return false
    }
  }

  // ================================================
  // REPO INFO (1 request)
  // ================================================

  static async getRepoDetails(url: string, token?: string): Promise<GithubRepoInfo> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) {
      throw new Error('URL do GitHub inválida. Use: https://github.com/usuario/repositorio')
    }

    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`,
        { headers: this.getHeaders(token), timeout: 15000 }
      )

      return {
        name: response.data.name,
        description: response.data.description,
        url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
        isPrivate: Boolean(response.data.private)
      }
    } catch (error: any) {
      const statusCode = error.response?.status
      const message = error.response?.data?.message || error.message
      
      if (statusCode === 404) {
        const err = new Error('Repositório não encontrado. Verifique a URL.') as any
        err.statusCode = 404
        throw err
      }
      if (statusCode === 401 || statusCode === 403) {
        if (error.response?.headers?.['x-ratelimit-remaining'] === '0') {
          const err = new Error('Limite de requisições do GitHub atingido. Aguarde ou use um token.') as any
          err.statusCode = 403
          throw err
        }
        const err = new Error('Sem permissão. Se for privado, adicione um token de acesso.') as any
        err.statusCode = statusCode
        throw err
      }
      const err = new Error(`Erro ao acessar GitHub: ${message}`) as any
      err.statusCode = statusCode || 500
      throw err
    }
  }

  // ================================================
  // DOWNLOAD ZIP (1 request)
  // ================================================

  private static async downloadRepoAsZip(url: string, token?: string): Promise<Buffer> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) throw new Error('URL do GitHub inválida')

    let defaultBranch = 'main'
    try {
      const repoResponse = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`,
        { headers: this.getHeaders(token), timeout: 15000 }
      )
      defaultBranch = repoResponse.data.default_branch || 'main'
    } catch {
      // best-effort
    }

    // Para repos privados: usar API do GitHub (retorna redirect com URL pre-assinada)
    if (token) {
      console.log(`[GithubService] Tentando download via API com token para ${repoInfo.owner}/${repoInfo.repo}`)
      const apiBranches = [...new Set([defaultBranch, 'main', 'master'])]
      for (const branch of apiBranches) {
        try {
          const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/zipball/${branch}`
          console.log(`[GithubService] Tentando: ${apiUrl}`)
          const response = await axios.get(apiUrl, {
              headers: this.getHeaders(token),
              responseType: 'arraybuffer',
              timeout: 600000,
              maxContentLength: 500 * 1024 * 1024
            }
          )
          console.log(`[GithubService] Download via API OK (${response.data.length} bytes)`)
          return Buffer.from(response.data)
        } catch (err: any) {
          console.error(`[GithubService] Falha API zipball/${branch}:`, err?.response?.status, err?.message)
          continue
        }
      }
      console.error('[GithubService] Todas tentativas via API falharam')
    }

    // Fallback: URLs publicas do github.com (repos publicos)
    console.log(`[GithubService] Tentando download via github.com (público)`)
    const zipUrls = [
      `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/${defaultBranch}.zip`,
      `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/main.zip`,
      `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/master.zip`
    ]

    for (const zipUrl of zipUrls) {
      try {
        const response = await axios.get(zipUrl, {
          headers: { 'User-Agent': '10xDev-App' },
          responseType: 'arraybuffer',
          timeout: 600000,
          maxContentLength: 500 * 1024 * 1024
        })
        console.log(`[GithubService] Download público OK (${response.data.length} bytes)`)
        return Buffer.from(response.data)
      } catch (err: any) {
        console.error(`[GithubService] Falha ${zipUrl}:`, err?.response?.status, err?.message)
        continue
      }
    }

    throw new Error('Não foi possível baixar o repositório. Se for privado, informe um token.')
  }

  // ================================================
  // EXTRACT & PROCESS ZIP
  // ================================================

  private static extractFilesFromZip(zipBuffer: Buffer): FileEntry[] {
    const zip = new AdmZip(zipBuffer)
    const entries = zip.getEntries()
    const files: FileEntry[] = []

    for (const entry of entries) {
      if (entry.isDirectory) continue

      // Drop root folder
      const parts = entry.entryName.split('/')
      parts.shift()
      const relativePath = parts.join('/')
      if (!relativePath) continue

      if (!this.shouldIncludeFile(relativePath)) continue
      if (entry.header.size > MAX_FILE_SIZE) continue

      try {
        const content = entry.getData().toString('utf-8')
        files.push({ path: relativePath, content, size: entry.header.size })
      } catch {
        continue
      }
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
    const ext = this.getFileExtension(path)
    return CODE_EXTENSIONS.includes(ext)
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
      const ext = this.getFileExtension(file.path)
      const lang = this.getLanguageFromExtension(ext)
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

  private static extractFeatureName(path: string): string {
    const pathNormalized = path.toLowerCase()
    const fileName = path.split('/').pop() || ''

    // PRIORIDADE -1: Arquivos específicos de linguagens
    // Python (Django/Flask)
    if (fileName === 'models.py') return 'database'
    if (fileName === 'views.py') return 'controller'
    if (fileName === 'serializers.py') return 'database'
    if (fileName === 'forms.py') return 'validation'
    if (fileName === 'tasks.py' || fileName === 'celery.py') return 'jobs'
    if (fileName === 'admin.py') return 'admin'
    if (fileName === 'urls.py') return 'routing'

    // Go
    if (fileName.endsWith('_handler.go')) return 'controller'
    if (fileName.endsWith('_service.go')) return 'service'
    if (fileName.endsWith('_repository.go')) return 'database'
    if (fileName.endsWith('_middleware.go')) return 'middleware'

    // Java (Spring Boot)
    if (fileName.endsWith('Controller.java')) return 'controller'
    if (fileName.endsWith('Service.java')) return 'service'
    if (fileName.endsWith('Repository.java')) return 'database'
    if (fileName.endsWith('Entity.java')) return 'database'
    if (fileName.endsWith('DTO.java')) return 'api'

    // Ruby (Rails)
    if (fileName.endsWith('_controller.rb')) return 'controller'
    if (fileName.endsWith('_service.rb')) return 'service'
    if (fileName.endsWith('_job.rb')) return 'jobs'
    if (fileName.endsWith('_mailer.rb')) return 'notification'

    // PRIORIDADE 0: Detecção por PATH específico
    // Componentes UI
    if (pathNormalized.includes('/components/ui/') || pathNormalized.includes('\\components\\ui\\')) {
      return 'ui'
    }

    // Skills n8n
    if (pathNormalized.includes('/skills/') || pathNormalized.includes('\\skills\\')) {
      return 'skill'
    }

    // Documentação
    if (pathNormalized.includes('/docs/') || pathNormalized.includes('\\docs\\')) {
      return 'docs'
    }
    if (pathNormalized.match(/readme\.md|contributing\.md|changelog\.md|license\.md/i)) {
      return 'docs'
    }
    // Qualquer arquivo .md é documentação
    if (pathNormalized.endsWith('.md')) {
      return 'docs'
    }

    // Utilitários
    if (pathNormalized.includes('/utils/') || pathNormalized.includes('\\utils\\')) {
      return 'utils'
    }
    if (pathNormalized.includes('/helpers/') || pathNormalized.includes('\\helpers\\')) {
      return 'utils'
    }

    // Hooks customizados
    if (pathNormalized.includes('/hooks/') || pathNormalized.includes('\\hooks\\')) {
      return 'hook'
    }

    // Testes
    if (pathNormalized.includes('/test') || pathNormalized.includes('\\test')) {
      return 'test'
    }
    if (pathNormalized.match(/\.test\.|\.spec\.|__tests__|\.e2e\./)) {
      return 'test'
    }

    // Configuração
    if (pathNormalized.match(/\.config\.|tsconfig|webpack|vite\.config|babel\.config|eslint/)) {
      return 'config'
    }
    // Arquivos de configuração comuns (multi-linguagem)
    if (pathNormalized.match(/package\.json|requirements\.txt|go\.mod|go\.sum|pom\.xml|build\.gradle|composer\.json|gemfile|pyproject\.toml|setup\.py|application\.properties|\.env|dockerfile|docker-compose|\.dockerignore|\.gitignore|\.prettierrc|\.editorconfig/)) {
      return 'config'
    }
    // Arquivos .json genéricos (exceto package.json já coberto acima)
    if (pathNormalized.endsWith('.json') && !pathNormalized.includes('/node_modules/')) {
      return 'config'
    }

    // Estilos
    if (pathNormalized.match(/\.css$|\.scss$|\.sass$|\.less$|tailwind/)) {
      return 'style'
    }

    const parts = path.split('/')
    const fileNameFromParts = parts.pop() || ''

    // 1. Detectar estruturas como src/features/auth/ ou src/modules/payments/
    const featureDirs = ['features', 'modules', 'domains', 'apps']
    for (let i = 0; i < parts.length - 1; i++) {
      if (featureDirs.includes(parts[i]?.toLowerCase() || '')) {
        const featureDir = parts[i + 1]
        if (featureDir && !['src', 'lib', 'app'].includes(featureDir.toLowerCase())) {
          return this.normalizeFeatureName(featureDir)
        }
      }
    }

    // 2. Extrair do nome do arquivo
    let baseName = fileNameFromParts
      .replace(/\.(ts|tsx|js|jsx|py|java|go|rs|rb|php|vue|svelte)$/i, '')
      .replace(/\.(test|spec|stories|styles?|module)$/i, '')
      .replace(/^index$/i, '')

    // 3. Se baseName vazio, usar diretório pai
    if (!baseName && parts.length > 0) {
      baseName = parts[parts.length - 1] || 'misc'
    }

    // 4. Remover sufixos comuns
    const suffixes = [
      'Controller', 'Service', 'Model', 'Routes', 'Router',
      'Validator', 'Middleware', 'Hook', 'Component', 'Page',
      'Store', 'Slice', 'Api', 'Utils', 'Helper',
      'Type', 'Interface', 'Schema', 'Dto', 'Entity',
      'Repository', 'Handler', 'Provider', 'Factory', 'Manager'
    ]

    for (const suffix of suffixes) {
      const re = new RegExp(`${suffix}s?$`, 'i')
      if (re.test(baseName)) {
        baseName = baseName.replace(re, '')
        break
      }
    }

    // 5. Remover prefixo use de hooks
    if (baseName.toLowerCase().startsWith('use')) {
      baseName = baseName.substring(3)
    }

    // 6. Normalizar e retornar (consolidateFeatures vai mapear semanticamente)
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

    // Buscar em qual feature semântica esse nome se encaixa
    for (const [feature, keywords] of Object.entries(FEATURE_SEMANTIC_MAP)) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) {
          return feature
        }
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

  private static consolidateFeatures(groups: Map<string, FeatureFile[]>): Map<string, FeatureFile[]> {
    console.log('[GithubService] Consolidando features...')
    console.log(`[GithubService] Grupos iniciais: ${groups.size}`)

    // ==================================================
    // PASSO 1: Mapear para features semânticas
    // ==================================================
    const semanticMap = new Map<string, string[]>() // semantic → [original names]

    for (const [name, files] of groups) {
      const semantic = this.mapToSemanticFeature(name)

      if (!semanticMap.has(semantic)) {
        semanticMap.set(semantic, [])
      }
      semanticMap.get(semantic)!.push(name)

      if (semantic !== name) {
        console.log(`[GithubService] '${name}' → '${semantic}'`)
      }
    }

    // ==================================================
    // PASSO 2: Consolidar TODAS features fragmentadas por semantic
    // ==================================================
    const consolidated = new Map<string, FeatureFile[]>()

    for (const [semantic, originalNames] of semanticMap) {
      const allFiles: FeatureFile[] = []

      for (const origName of originalNames) {
        const files = groups.get(origName)!
        allFiles.push(...files)
      }

      consolidated.set(semantic, allFiles)

      if (originalNames.length > 1) {
        console.log(`[GithubService] Consolidado '${semantic}': ${originalNames.length} grupos → ${allFiles.length} arquivos`)
      }
    }

    // ==================================================
    // PASSO 3: Dividir features MUITO GRANDES inteligentemente
    // ==================================================
    const result = new Map<string, FeatureFile[]>()

    for (const [semantic, files] of consolidated) {
      // Sempre consolidar - deixar IA decidir se precisa dividir (>50 arquivos)
      result.set(semantic, files)
    }

    console.log(`[GithubService] Features finais: ${result.size}`)

    // Logar resultado
    for (const [feature, files] of result) {
      const layers = [...new Set(files.map(f => f.layer))]
      console.log(`[GithubService] Feature '${feature}': ${files.length} arquivos [${layers.join(', ')}]`)
    }

    return result
  }

  /**
   * Divide features muito grandes em sub-features coerentes
   */
  private static smartSplitLargeFeature(
    semantic: string,
    files: FeatureFile[]
  ): Map<string, FeatureFile[]> {
    const result = new Map<string, FeatureFile[]>()

    // Agrupar por layer
    const byLayer = new Map<string, FeatureFile[]>()
    for (const file of files) {
      if (!byLayer.has(file.layer)) byLayer.set(file.layer, [])
      byLayer.get(file.layer)!.push(file)
    }

    const backendLayers = ['routes', 'controllers', 'services', 'models', 'middleware']
    const frontendLayers = ['hooks', 'components', 'pages', 'stores']

    const backendFiles: FeatureFile[] = []
    const frontendFiles: FeatureFile[] = []
    const otherFiles: FeatureFile[] = []

    for (const [layer, layerFiles] of byLayer) {
      if (backendLayers.includes(layer)) {
        backendFiles.push(...layerFiles)
      } else if (frontendLayers.includes(layer)) {
        frontendFiles.push(...layerFiles)
      } else {
        otherFiles.push(...layerFiles)
      }
    }

    // Dividir apenas se AMBOS backend e frontend são grandes
    if (backendFiles.length > 15 && frontendFiles.length > 15) {
      result.set(`${semantic}-backend`, backendFiles)
      result.set(`${semantic}-frontend`, frontendFiles)
      if (otherFiles.length > 0) {
        result.set(`${semantic}-shared`, otherFiles)
      }
      console.log(`[GithubService] Split '${semantic}': backend (${backendFiles.length}), frontend (${frontendFiles.length})`)
    } else {
      // Não dividir - manter junto
      result.set(semantic, files)
    }

    return result
  }

  private static generateFeatureTitle(featureName: string, files: FeatureFile[]): string {
    const layers = new Set(files.map(f => f.layer))
    const hasBackend = ['routes', 'controllers', 'services', 'models'].some(l => layers.has(l))
    const hasFrontend = ['hooks', 'components', 'pages', 'stores'].some(l => layers.has(l))

    // Usar título amigável da constante FEATURE_TITLES
    const title = FEATURE_TITLES[featureName] || this.capitalizeFirst(featureName)

    if (hasBackend && hasFrontend) return `Sistema de ${title}`
    if (hasBackend) return `API de ${title}`
    if (hasFrontend) return `Interface de ${title}`
    return title
  }

  private static generateFeatureDescription(featureName: string, files: FeatureFile[]): string {
    const layers = [...new Set(files.map(f => f.layer))].filter(l => l !== 'other')
    const fileCount = files.length
    const cap = featureName.charAt(0).toUpperCase() + featureName.slice(1)

    // Detectar métodos HTTP nos arquivos de rotas
    const routeMethods: string[] = []
    for (const file of files.filter(f => f.layer === 'routes')) {
      const content = file.content.toLowerCase()
      if (content.includes('.get(')) routeMethods.push('GET')
      if (content.includes('.post(')) routeMethods.push('POST')
      if (content.includes('.put(')) routeMethods.push('PUT')
      if (content.includes('.delete(')) routeMethods.push('DELETE')
      if (content.includes('.patch(')) routeMethods.push('PATCH')
    }
    const uniqueMethods = [...new Set(routeMethods)]

    // Construir descrição
    const parts: string[] = []

    if (layers.includes('controllers') && layers.includes('services')) {
      parts.push(`Backend completo do módulo ${cap}`)
    } else if (layers.includes('components') && layers.includes('hooks')) {
      parts.push(`Frontend completo do módulo ${cap}`)
    } else if (layers.includes('controllers') || layers.includes('services') || layers.includes('routes')) {
      parts.push(`Backend do módulo ${cap}`)
    } else if (layers.includes('components') || layers.includes('pages')) {
      parts.push(`Frontend do módulo ${cap}`)
    } else {
      parts.push(`Módulo ${cap}`)
    }

    if (uniqueMethods.length > 0) {
      parts.push(`com endpoints ${uniqueMethods.join('/')}`)
    }

    parts.push(`(${fileCount} arquivos)`)

    return parts.join(' ')
  }

  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private static makeSnippet(content: string): string {
    return content.slice(0, 1200)
  }

  // ================================================
  // AUTO-TAGGING
  // ================================================

  /**
   * Mapeamento de categorias para tags automáticas
   */
  private static readonly CATEGORY_TO_TAGS: Record<string, string[]> = {
    'Componentes UI': ['ui', 'componentes', 'interface', 'frontend'],
    'Hooks Customizados': ['hooks', 'react', 'frontend', 'custom'],
    'Documentação': ['docs', 'documentação', 'guias', 'readme'],
    'Skills n8n': ['n8n', 'workflow', 'automation', 'skills'],
    'Utilitários': ['utils', 'helpers', 'utilities', 'ferramentas'],
    'Configurações': ['config', 'setup', 'settings', 'configuração'],
    'Testes': ['test', 'testing', 'qa', 'quality'],
    'Build & Tooling': ['build', 'webpack', 'bundler', 'tooling'],
    'Estilos': ['css', 'styles', 'theme', 'design'],
    'Templates': ['template', 'starter', 'boilerplate'],
    'Middlewares': ['middleware', 'backend', 'server'],
    'Roteamento': ['routing', 'routes', 'navigation', 'guard'],
    'Modelos de Dados': ['model', 'database', 'schema', 'data'],
    'Integrações': ['integration', 'api', 'third-party'],
    'Cliente de API': ['api', 'client', 'http', 'rest']
  }

  /**
   * Gera tags automáticas baseadas na categoria e tech
   */
  private static generateAutoTags(category: string, featureName: string, tech: string): string[] {
    const tags: string[] = []

    // 1. Tags da categoria
    const categoryTags = this.CATEGORY_TO_TAGS[category] || []
    tags.push(...categoryTags)

    // 2. Tag da feature name (limpa)
    if (featureName && featureName !== 'misc') {
      tags.push(featureName.toLowerCase())
    }

    // 3. Tag da tech
    if (tech && tech !== 'Geral') {
      tags.push(tech.toLowerCase().replace(/\./g, ''))
    }

    // 4. Remover duplicatas e limpar
    return [...new Set(tags)].filter(t => t.length > 2)
   }

   // ================================================
   // ESTIMATIVA DE CARDS
   // ================================================

   private static estimateCardsCount(featureGroups: [string, FeatureFile[]][]): number {
     // Heurística 1: 1 card por feature (mínimo)
     const byFeature = featureGroups.length

     // Heurística 2: 1 card por 5 arquivos
     const totalFiles = featureGroups.reduce(
       (sum, [_, files]) => sum + files.length,
       0
     )
     const byFiles = Math.ceil(totalFiles / 5)

     // Heurística 3: 1 card por 50KB
     const totalSize = featureGroups.reduce(
       (sum, [_, files]) =>
         sum + files.reduce((s, f) => s + f.size, 0),
       0
     )
     const bySize = Math.ceil(totalSize / (50 * 1024))

     // Usar máximo das heurísticas, com mínimo de 10
     return Math.max(byFeature, byFiles, bySize, 10)
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
    options?.onProgress?.({ step: 'downloading_zip', progress: 10, message: 'Baixando o repositório do GitHub...' })
    const zipBuffer = await this.downloadRepoAsZip(url, token)

    options?.onProgress?.({ step: 'extracting_files', progress: 25, message: 'Extraindo arquivos do repositório...' })
    const files = this.extractFilesFromZip(zipBuffer)

    if (files.length === 0) throw new Error('Nenhum arquivo de código encontrado no repositório.')

    let packageJson: any = null
    const pkg = files.find(f => f.path === 'package.json')
    if (pkg) {
      try { packageJson = JSON.parse(pkg.content) } catch { /* ignore */ }
    }

    const tech = this.detectTech(files, packageJson)
    const mainLanguage = this.detectMainLanguage(files)

    options?.onProgress?.({ step: 'analyzing_repo', progress: 45, message: `Tecnologia detectada: ${tech}. Mapeando funcionalidades...` })
    const featureGroups = this.groupFilesByFeature(files)
    options?.onProgress?.({ step: 'generating_cards', progress: 55, message: 'Organizando funcionalidades...' })

    const useAiRequested = options?.useAi === true
    const useAi = useAiRequested && AiCardGroupingService.isEnabled() && AiCardGroupingService.hasConfig()

    console.log('[GithubService] Decisão de IA:', {
      useAiRequested,
      isEnabled: AiCardGroupingService.isEnabled(),
      hasConfig: AiCardGroupingService.hasConfig(),
      willUseAi: useAi
    })

    let cards: CreateCardFeatureRequest[] = []
    let filesProcessed = 0
    let aiCardsCreated = 0

     const featureGroupsArray = Array.from(featureGroups.entries())
     const totalFeatures = featureGroupsArray.length
     
     // Estimar quantidade de cards que serão criados
     const estimatedCards = this.estimateCardsCount(featureGroupsArray)
     console.log('[GithubService] Estimativa de cards:', estimatedCards)
     
     let featureIndex = 0

     for (const [featureName, featureFiles] of featureGroupsArray) {
      featureIndex++
      const featureProgress = 55 + Math.floor((featureIndex / totalFeatures) * 15) // 55-70%

      // --- AI path (best-effort) ---
       if (useAi) {
         options?.onProgress?.({
           step: 'generating_cards',
           progress: featureProgress,
           message: `🤖 IA analisando: ${featureName} (${featureFiles.length} arquivos) [${featureIndex}/${totalFeatures}]`,
           cardEstimate: estimatedCards
         })
        try {
          const mode = AiCardGroupingService.mode()
          const fileMetas = featureFiles.map(f => ({
            path: f.path,
            layer: f.layer,
            featureName: f.featureName,
            size: f.size,
            snippet: mode === 'full' ? f.content : this.makeSnippet(f.content)
          }))

          const proposedGroups = [{ key: featureName, files: featureFiles.map(f => f.path) }]
          const ai = await AiCardGroupingService.refineGrouping({
            repoUrl: url,
            detectedTech: tech,
            detectedLanguage: mainLanguage,
            files: fileMetas,
            proposedGroups
          })

          console.log('[GithubService] IA retornou', ai.cards.length, 'cards para', featureName)

           options?.onProgress?.({
             step: 'generating_cards',
             progress: featureProgress,
             message: `✅ IA criou ${ai.cards.length} card(s) para "${featureName}" [${featureIndex}/${totalFeatures}]`,
             cardEstimate: estimatedCards
           })

          for (const aiCard of ai.cards) {
            const screens: CardFeatureScreen[] = []
            for (const s of aiCard.screens) {
              const blocks: ContentBlock[] = []
              for (const filePath of s.files) {
                const file = featureFiles.find(ff => ff.path === filePath)
                if (!file) continue
                const ext = this.getFileExtension(file.path)
                const language = this.getLanguageFromExtension(ext)
                const fileName = file.path.split('/').pop() || file.path
                blocks.push({
                  id: randomUUID(),
                  type: ContentType.CODE,
                  content: file.content,
                  language,
                  title: fileName,
                  route: file.path,
                  order: blocks.length
                })
                filesProcessed++
              }
              if (blocks.length === 0) continue
              screens.push({ name: s.name, description: cleanMarkdown(s.description || ''), route: s.files[0] || '', blocks })
            }
            if (screens.length === 0) continue
            const category = FEATURE_TITLES[featureName] || this.capitalizeFirst(featureName)
            const newCard: CreateCardFeatureRequest = {
              title: cleanMarkdown(aiCard.title),
              description: cleanMarkdown(aiCard.description || this.generateFeatureDescription(featureName, featureFiles)),
              tech: aiCard.tech || tech,
              language: aiCard.language || mainLanguage,
              content_type: ContentType.CODE,
              card_type: CardType.CODIGOS,
              category,
              tags: this.generateAutoTags(category, featureName, tech),
              visibility: Visibility.UNLISTED,
              screens
            }
            cards.push(newCard)
            aiCardsCreated++
            
            // Create card immediately if callback provided
            if (options?.onCardReady) {
              try {
                await options.onCardReady(newCard)
              } catch (err) {
                console.error(`Erro ao criar card "${newCard.title}" imediatamente:`, err)
                // Continue processing other cards even if one fails
              }
            }
          }

          if (ai.cards.length > 0) continue
        } catch (featureErr: any) {
          console.error('[GithubService] Erro IA em feature:', featureName, '-', featureErr?.message)
           options?.onProgress?.({
             step: 'generating_cards',
             progress: featureProgress,
             message: `⚠️ IA falhou em "${featureName}", usando heurística [${featureIndex}/${totalFeatures}]`,
             cardEstimate: estimatedCards
           })
          // fallback to heuristic
        }
      }

      // --- Heuristic path ---
      if (!useAi) {
         options?.onProgress?.({
           step: 'generating_cards',
           progress: featureProgress,
           message: `📁 Organizando: ${featureName} (${featureFiles.length} arquivos) [${featureIndex}/${totalFeatures}]`,
           cardEstimate: estimatedCards
         })
      }
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
          const ext = this.getFileExtension(file.path)
          const language = this.getLanguageFromExtension(ext)
          const fileName = file.path.split('/').pop() || file.path
          blocks.push({
            id: randomUUID(),
            type: ContentType.CODE,
            content: file.content,
            language,
            title: fileName,
            route: file.path,
            order: blocks.length
          })
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

      const category = FEATURE_TITLES[featureName] || this.capitalizeFirst(featureName)
      const heuristicCard: CreateCardFeatureRequest = {
        title: this.generateFeatureTitle(featureName, featureFiles),
        tech,
        language: mainLanguage,
        description: this.generateFeatureDescription(featureName, featureFiles),
        content_type: ContentType.CODE,
        card_type: CardType.CODIGOS,
        category,
        tags: this.generateAutoTags(category, featureName, tech),
        visibility: Visibility.UNLISTED,
        screens
      }
      cards.push(heuristicCard)
      
      // Create heuristic card immediately if callback provided
      if (options?.onCardReady) {
        try {
          await options.onCardReady(heuristicCard)
        } catch (err) {
          console.error(`Erro ao criar card heurístico "${heuristicCard.title}" imediatamente:`, err)
          // Continue processing other cards even if one fails
        }
      }
    }

    cards.sort((a, b) => (b.screens?.length || 0) - (a.screens?.length || 0))

    const aiSummary = aiCardsCreated > 0
      ? `🤖 IA criou ${aiCardsCreated} cards de ${cards.length} totais`
      : `📁 ${cards.length} cards criados via heurística`
    options?.onProgress?.({
      step: 'generating_cards',
      progress: 70,
      message: `${aiSummary} (${filesProcessed} arquivos)`,
      cardEstimate: estimatedCards,
      cardCount: cards.length
    })

    // Supervisor de qualidade
    options?.onProgress?.({
      step: 'quality_check',
      progress: 80,
      message: '🔍 Supervisor de qualidade analisando cards...',
      cardEstimate: estimatedCards,
      cardCount: cards.length
    })

    console.log('\n[GithubService] Executando supervisor de qualidade...')
    const qualityReport = CardQualitySupervisor.analyzeQuality(cards)

    if (qualityReport.issuesFound > 0) {
      console.log(`[GithubService] Supervisor detectou ${qualityReport.issuesFound} issue(s) de qualidade`)

       options?.onProgress?.({
         step: 'quality_corrections',
         progress: 85,
         message: '🔧 Aplicando correções automáticas...',
         cardEstimate: estimatedCards,
         cardCount: cards.length
       })

      const corrections = CardQualitySupervisor.applyCorrections(cards, qualityReport)
      cards = corrections.correctedCards

      console.log(`[GithubService] Correções aplicadas: ${corrections.mergesApplied} merge(s), ${corrections.cardsRemoved} remoção(ões)`)
      console.log(`[GithubService] Cards finais após correções: ${cards.length}`)

       options?.onProgress?.({
         step: 'quality_corrections',
         progress: 90,
         message: `✅ Correções aplicadas: ${corrections.mergesApplied} merge(s), ${corrections.cardsRemoved} remoção(ões)`,
         cardEstimate: estimatedCards,
         cardCount: cards.length
       })
    } else {
      console.log('[GithubService] Supervisor: qualidade OK, nenhum problema detectado')
       options?.onProgress?.({
         step: 'quality_check',
         progress: 90,
         message: '✅ Supervisor: qualidade OK',
         cardEstimate: estimatedCards,
         cardCount: cards.length
       })
    }

    return { cards, filesProcessed, aiUsed: aiCardsCreated > 0, aiCardsCreated }
  }
}

