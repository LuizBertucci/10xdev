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
  'auth': ['auth', 'login', 'logout', 'register', 'signup', 'signin', 'password', 'session', 'token', 'jwt', 'oauth', 'credential'],
  'user': ['user', 'profile', 'account', 'avatar', 'preferences', 'member'],
  'payment': ['payment', 'billing', 'checkout', 'stripe', 'invoice', 'subscription', 'pricing'],
  'database': ['supabase', 'database', 'db', 'prisma', 'drizzle', 'postgres', 'mysql', 'mongo', 'migration'],
  'n8n': ['n8n', 'workflow', 'automation', 'node', 'trigger', 'webhook', 'execution'],
  'ai': ['ai', 'openai', 'gpt', 'llm', 'embedding', 'vector', 'langchain', 'claude', 'anthropic'],
  'notification': ['notification', 'alert', 'toast', 'email', 'sms', 'push'],
  'card': ['card', 'cardfeature', 'feature'],
  'project': ['project', 'projeto', 'import', 'github', 'repo'],
  'template': ['template'],
  'content': ['content', 'conteudo', 'post', 'article'],
  'admin': ['admin', 'dashboard', 'backoffice'],
  'api': ['apiclient', 'httpclient', 'axios', 'fetch'],
  'storage': ['storage', 'upload', 'file', 's3', 'bucket', 'blob'],
  'ui': ['button', 'input', 'select', 'dialog', 'modal', 'dropdown', 'tooltip', 'badge', 'avatar', 'table', 'form', 'checkbox', 'radio', 'switch', 'slider', 'collapsible', 'accordion', 'tabs', 'sheet', 'popover', 'scroll', 'separator', 'label', 'textarea', 'calendar', 'command', 'context', 'hover', 'menubar', 'navigation', 'progress', 'skeleton', 'sonner', 'toast', 'alert', 'drawer', 'aspectratio', 'breadcrumb', 'carousel', 'chart', 'combobox', 'datepicker', 'resizable', 'toggle', 'togglegroup'],
  'docs': ['readme', 'documentation', 'docs', 'guide', 'tutorial', 'changelog', 'contributing', 'license', 'roadmap', 'architecture', 'design'],
  'skill': ['skill', 'skills'],
  'utils': ['util', 'utils', 'helper', 'helpers', 'lib', 'libs', 'common', 'shared', 'constants', 'types'],
  'config': ['config', 'configuration', 'settings', 'env', 'environment', 'setup', 'initialize'],
  'test': ['test', 'tests', 'spec', 'testing', '__tests__', 'e2e', 'integration', 'unit', 'mock', 'fixture'],
  'build': ['build', 'webpack', 'vite', 'rollup', 'esbuild', 'tsconfig', 'babel', 'eslint', 'prettier', 'lint', 'format'],
  'style': ['css', 'scss', 'sass', 'less', 'style', 'styles', 'tailwind', 'theme', 'colors'],
  'hook': ['hook', 'hooks']
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
  'ui': 'Componentes UI',
  'docs': 'Documentação',
  'skill': 'Skills n8n',
  'utils': 'Utilitários',
  'config': 'Configuração',
  'test': 'Testes',
  'build': 'Build & Tooling',
  'style': 'Estilos',
  'hook': 'Hooks Customizados'
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

  private static getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': '10xDev-App'
    }
    if (token) headers.Authorization = `token ${token}`
    return headers
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
      if (error.response?.status === 404) {
        throw new Error('Repositório não encontrado. Verifique a URL.')
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        if (error.response?.headers?.['x-ratelimit-remaining'] === '0') {
          throw new Error('Limite de requisições do GitHub atingido. Aguarde ou use um token.')
        }
        throw new Error('Sem permissão. Se for privado, adicione um token de acesso.')
      }
      throw new Error(`Erro ao acessar GitHub: ${error.message}`)
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

    const zipUrls = [
      `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/${defaultBranch}.zip`,
      `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/main.zip`,
      `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/master.zip`
    ]

    const headers: Record<string, string> = { 'User-Agent': '10xDev-App' }
    if (token) headers.Authorization = `token ${token}`

    for (const zipUrl of zipUrls) {
      try {
        const response = await axios.get(zipUrl, {
          headers,
          responseType: 'arraybuffer',
          timeout: 600000,
          maxContentLength: 500 * 1024 * 1024
        })
        return Buffer.from(response.data)
      } catch {
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
    const normalized = path.toLowerCase()

    // PRIORIDADE 0: Detecção por PATH específico
    // Componentes UI
    if (normalized.includes('/components/ui/') || normalized.includes('\\components\\ui\\')) {
      return 'ui'
    }

    // Skills n8n
    if (normalized.includes('/skills/') || normalized.includes('\\skills\\')) {
      return 'skill'
    }

    // Documentação
    if (normalized.includes('/docs/') || normalized.includes('\\docs\\')) {
      return 'docs'
    }
    if (normalized.match(/readme\.md|contributing\.md|changelog\.md|license\.md/i)) {
      return 'docs'
    }

    // Utilitários
    if (normalized.includes('/utils/') || normalized.includes('\\utils\\')) {
      return 'utils'
    }
    if (normalized.includes('/helpers/') || normalized.includes('\\helpers\\')) {
      return 'utils'
    }

    // Hooks customizados
    if (normalized.includes('/hooks/') || normalized.includes('\\hooks\\')) {
      return 'hook'
    }

    // Testes
    if (normalized.includes('/test') || normalized.includes('\\test')) {
      return 'test'
    }
    if (normalized.match(/\.test\.|\.spec\.|__tests__|\.e2e\./)) {
      return 'test'
    }

    // Configuração
    if (normalized.match(/\.config\.|tsconfig|webpack|vite\.config|babel\.config|eslint/)) {
      return 'config'
    }

    // Estilos
    if (normalized.match(/\.css$|\.scss$|\.sass$|\.less$|tailwind/)) {
      return 'style'
    }

    const parts = path.split('/')
    const fileName = parts.pop() || ''

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
    let baseName = fileName
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

    // 6. Mapear para feature semântica
    const normalized = this.normalizeFeatureName(baseName)
    return this.mapToSemanticFeature(normalized)
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

    // Agrupar por feature semântica
    const semanticGroups = new Map<string, FeatureFile[]>()

    for (const [name, files] of groups) {
      const semanticFeature = this.mapToSemanticFeature(name)

      if (semanticFeature !== name) {
        console.log(`[GithubService] '${name}' → '${semanticFeature}'`)
      }

      if (!semanticGroups.has(semanticFeature)) {
        semanticGroups.set(semanticFeature, [])
      }
      semanticGroups.get(semanticFeature)!.push(...files)
    }

    console.log(`[GithubService] Features finais: ${semanticGroups.size}`)

    // Logar resultado
    for (const [feature, files] of semanticGroups) {
      const layers = [...new Set(files.map(f => f.layer))]
      console.log(`[GithubService] Feature '${feature}': ${files.length} arquivos [${layers.join(', ')}]`)
    }

    return semanticGroups
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
  // MAIN PROCESSING
  // ================================================

  static async processRepoToCards(
    url: string,
    token?: string,
    options?: {
      useAi?: boolean
      onProgress?: (update: { step: string; progress?: number; message?: string }) => void
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
    let featureIndex = 0

    for (const [featureName, featureFiles] of featureGroupsArray) {
      featureIndex++
      const featureProgress = 55 + Math.floor((featureIndex / totalFeatures) * 15) // 55-70%

      // --- AI path (best-effort) ---
      if (useAi) {
        options?.onProgress?.({
          step: 'generating_cards',
          progress: featureProgress,
          message: `🤖 IA analisando: ${featureName} (${featureFiles.length} arquivos) [${featureIndex}/${totalFeatures}]`
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
            message: `✅ IA criou ${ai.cards.length} card(s) para "${featureName}" [${featureIndex}/${totalFeatures}]`
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
              screens.push({ name: s.name, description: '', route: s.files[0] || '', blocks })
            }
            if (screens.length === 0) continue
            const newCard: CreateCardFeatureRequest = {
              title: aiCard.title,
              description: aiCard.description || this.generateFeatureDescription(featureName, featureFiles),
              tech: aiCard.tech || tech,
              language: aiCard.language || mainLanguage,
              content_type: ContentType.CODE,
              card_type: CardType.CODIGOS,
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
            message: `⚠️ IA falhou em "${featureName}", usando heurística [${featureIndex}/${totalFeatures}]`
          })
          // fallback to heuristic
        }
      }

      // --- Heuristic path ---
      if (!useAi) {
        options?.onProgress?.({
          step: 'generating_cards',
          progress: featureProgress,
          message: `📁 Organizando: ${featureName} (${featureFiles.length} arquivos) [${featureIndex}/${totalFeatures}]`
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

      const heuristicCard: CreateCardFeatureRequest = {
        title: this.generateFeatureTitle(featureName, featureFiles),
        tech,
        language: mainLanguage,
        description: this.generateFeatureDescription(featureName, featureFiles),
        content_type: ContentType.CODE,
        card_type: CardType.CODIGOS,
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
      message: `${aiSummary} (${filesProcessed} arquivos)`
    })

    // Supervisor de qualidade
    options?.onProgress?.({
      step: 'quality_check',
      progress: 80,
      message: '🔍 Supervisor de qualidade analisando cards...'
    })

    console.log('\n[GithubService] Executando supervisor de qualidade...')
    const qualityReport = CardQualitySupervisor.analyzeQuality(cards)

    if (qualityReport.issuesFound > 0) {
      console.log(`[GithubService] Supervisor detectou ${qualityReport.issuesFound} issue(s) de qualidade`)

      options?.onProgress?.({
        step: 'quality_corrections',
        progress: 85,
        message: '🔧 Aplicando correções automáticas...'
      })

      const corrections = CardQualitySupervisor.applyCorrections(cards, qualityReport)
      cards = corrections.correctedCards

      console.log(`[GithubService] Correções aplicadas: ${corrections.mergesApplied} merge(s), ${corrections.cardsRemoved} remoção(ões)`)
      console.log(`[GithubService] Cards finais após correções: ${cards.length}`)

      options?.onProgress?.({
        step: 'quality_corrections',
        progress: 90,
        message: `✅ Correções aplicadas: ${corrections.mergesApplied} merge(s), ${corrections.cardsRemoved} remoção(ões)`
      })
    } else {
      console.log('[GithubService] Supervisor: qualidade OK, nenhum problema detectado')
      options?.onProgress?.({
        step: 'quality_check',
        progress: 90,
        message: '✅ Supervisor: qualidade OK'
      })
    }

    return { cards, filesProcessed, aiUsed: aiCardsCreated > 0, aiCardsCreated }
  }
}

