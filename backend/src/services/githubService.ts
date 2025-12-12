import axios from 'axios'
import type { 
  GithubRepoInfo, 
  GithubTreeItem, 
  GithubFileInfo 
} from '@/types/project'
import {
  ContentType,
  CardType
} from '@/types/cardfeature'
import type { 
  CreateCardFeatureRequest, 
  CardFeatureScreen, 
  ContentBlock
} from '@/types/cardfeature'
import { randomUUID } from 'crypto'

// ================================================
// CONFIGURATION - SEM LIMITES ARTIFICIAIS
// ================================================

// Tamanho máximo de arquivo (200KB - arquivos maiores geralmente são gerados/minificados)
const MAX_FILE_SIZE = 200 * 1024

// Delay mínimo entre requisições (para não sobrecarregar)
const REQUEST_DELAY = 50

// Extensões de arquivos de código suportadas
const CODE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.java', '.kt', '.kts',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.c', '.cpp', '.cc', '.h', '.hpp',
  '.cs',
  '.swift',
  '.vue', '.svelte',
  '.html', '.htm',
  '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.toml',
  '.md', '.mdx',
  '.sql',
  '.sh', '.bash', '.zsh',
  '.dockerfile', '.env'
]

// Diretórios a ignorar
const IGNORED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
  'coverage',
  '.cache',
  '.turbo',
  'vendor',
  'packages',
  '.yarn',
  '.pnpm',
  'out',
  '.output',
  'target',
  'bin',
  'obj',
  '__tests__',
  '__mocks__',
  'test',
  'tests',
  'spec',
  'specs',
  'e2e',
  'cypress',
  'playwright',
  '.github',
  '.husky',
  'docs',
  'documentation',
  'examples',
  'example',
  'demo',
  'demos',
  'fixtures',
  'mocks',
  'storybook',
  '.storybook'
]

// Arquivos a ignorar
const IGNORED_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'thumbs.db',
  '.gitignore',
  '.gitattributes',
  '.npmrc',
  '.nvmrc',
  '.prettierrc',
  '.prettierignore',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.json',
  'eslint.config.js',
  'eslint.config.mjs',
  'tsconfig.json',
  'tsconfig.node.json',
  'jsconfig.json',
  'jest.config.js',
  'jest.config.ts',
  'vitest.config.ts',
  'vite.config.ts',
  'next.config.js',
  'next.config.mjs',
  'tailwind.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  'postcss.config.mjs',
  '.env.example',
  '.env.local',
  '.env.development',
  '.env.production',
  'LICENSE',
  'LICENSE.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md'
]

// Mapeamento de extensão para linguagem
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.pyw': 'python',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.sql': 'sql',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.dockerfile': 'dockerfile',
  '.env': 'plaintext'
}

// Mapeamento de linguagem/framework para tech
const TECH_DETECTION: Record<string, string> = {
  'react': 'React',
  'next': 'Next.js',
  'vue': 'Vue.js',
  'angular': 'Angular',
  'svelte': 'Svelte',
  'express': 'Express',
  'fastify': 'Fastify',
  'nest': 'NestJS',
  'django': 'Django',
  'flask': 'Flask',
  'fastapi': 'FastAPI',
  'spring': 'Spring',
  'rails': 'Rails'
}

// Arquivos prioritários (mais importantes para entender o projeto)
const PRIORITY_PATTERNS = [
  /^src\/.*\.(ts|tsx|js|jsx)$/,
  /^app\/.*\.(ts|tsx|js|jsx)$/,
  /^pages\/.*\.(ts|tsx|js|jsx)$/,
  /^components\/.*\.(ts|tsx|js|jsx)$/,
  /^lib\/.*\.(ts|tsx|js|jsx)$/,
  /^utils\/.*\.(ts|tsx|js|jsx)$/,
  /^services\/.*\.(ts|tsx|js|jsx)$/,
  /^hooks\/.*\.(ts|tsx|js|jsx)$/,
  /^api\/.*\.(ts|tsx|js|jsx)$/,
  /^controllers\/.*\.(ts|tsx|js|jsx)$/,
  /^models\/.*\.(ts|tsx|js|jsx)$/,
  /^routes\/.*\.(ts|tsx|js|jsx)$/
]

interface ParsedRepoInfo {
  owner: string
  repo: string
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Flag global para parar processamento em caso de rate limiting
let rateLimitHit = false

async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number,
  delayMs: number
): Promise<R[]> {
  const results: R[] = []
  rateLimitHit = false
  
  for (let i = 0; i < items.length; i += batchSize) {
    // Parar se atingiu rate limit
    if (rateLimitHit) {
      console.log('[GitHub Import] Parando processamento devido a rate limit')
      break
    }
    
    const batch = items.slice(i, i + batchSize)
    
    // Processar sequencialmente dentro do batch para melhor controle
    for (const item of batch) {
      if (rateLimitHit) break
      try {
        const result = await processor(item)
        results.push(result)
      } catch (error: any) {
        if (error.message?.includes('rate') || error.message?.includes('Limite')) {
          rateLimitHit = true
          throw error
        }
        // Para outros erros, continua processando
        console.error('[GitHub Import] Erro ao processar item:', error.message)
      }
      // Pequeno delay entre cada arquivo
      await sleep(50)
    }
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < items.length && !rateLimitHit) {
      await sleep(delayMs)
    }
  }
  
  return results
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

      return {
        owner: parts[0]!,
        repo: parts[1]!.replace('.git', '')
      }
    } catch {
      return null
    }
  }

  private static getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    }
    if (token) {
      headers['Authorization'] = `token ${token}`
    }
    return headers
  }

  // ================================================
  // REPO INFO
  // ================================================

  static async getRepoDetails(url: string, token?: string): Promise<GithubRepoInfo> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) {
      throw new Error('URL do GitHub inválida')
    }

    try {
      const headers = this.getHeaders(token)
      const response = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`,
        { headers, timeout: 10000 }
      )

      const cleanUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}`

      return {
        name: response.data.name,
        description: response.data.description,
        url: cleanUrl,
        isPrivate: response.data.private
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Repositório não encontrado. Verifique a URL ou se é um repositório privado (necessário token).')
      }
      if (error.response?.status === 401) {
        throw new Error('Token inválido ou sem permissão para acessar o repositório.')
      }
      if (error.response?.status === 403) {
        throw new Error('Limite de requisições do GitHub atingido. Tente novamente em alguns minutos ou use um token de acesso.')
      }
      throw new Error(`Erro ao acessar GitHub: ${error.message}`)
    }
  }

  // ================================================
  // FILE TREE
  // ================================================

  static async getRepoTree(url: string, token?: string): Promise<GithubTreeItem[]> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) {
      throw new Error('URL do GitHub inválida')
    }

    try {
      const headers = this.getHeaders(token)
      
      // Primeiro, buscar o branch default
      const repoResponse = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`,
        { headers, timeout: 10000 }
      )
      const defaultBranch = repoResponse.data.default_branch || 'main'

      // Buscar a árvore de arquivos recursivamente
      const treeResponse = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers, timeout: 30000 }
      )

      return treeResponse.data.tree as GithubTreeItem[]
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Não foi possível acessar os arquivos do repositório.')
      }
      if (error.response?.status === 403) {
        throw new Error('Limite de requisições do GitHub atingido. Tente novamente em alguns minutos ou use um token de acesso.')
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout ao buscar arquivos. O repositório pode ser muito grande.')
      }
      throw new Error(`Erro ao buscar arquivos: ${error.message}`)
    }
  }

  // ================================================
  // FILE CONTENT
  // ================================================

  static async getFileContent(url: string, filePath: string, token?: string): Promise<string> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) {
      return ''
    }

    try {
      const headers = this.getHeaders(token)
      const response = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${filePath}`,
        { headers, timeout: 15000 }
      )

      // Verificar tamanho do arquivo
      if (response.data.size && response.data.size > MAX_FILE_SIZE) {
        console.log(`Arquivo ${filePath} muito grande (${response.data.size} bytes), ignorando...`)
        return ''
      }

      if (response.data.encoding === 'base64') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8')
      }

      return response.data.content || ''
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error(`[GitHub Import] Rate limit atingido ao buscar ${filePath}`)
        rateLimitHit = true
        throw new Error('Limite de requisições do GitHub atingido. Use um token de acesso pessoal.')
      }
      if (error.response?.status === 404) {
        console.log(`[GitHub Import] Arquivo não encontrado: ${filePath}`)
        return ''
      }
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.error(`[GitHub Import] Timeout ao buscar ${filePath}`)
        return ''
      }
      console.error(`[GitHub Import] Erro ao buscar ${filePath}:`, error.message)
      return ''
    }
  }

  // ================================================
  // PROCESSING HELPERS
  // ================================================

  private static getFileExtension(path: string): string {
    const lastDot = path.lastIndexOf('.')
    if (lastDot === -1) return ''
    
    // Handle special cases like Dockerfile
    const fileName = path.split('/').pop() || ''
    if (fileName.toLowerCase() === 'dockerfile') return '.dockerfile'
    if (fileName.startsWith('.env')) return '.env'
    
    return path.substring(lastDot).toLowerCase()
  }

  private static getLanguageFromExtension(ext: string): string {
    return EXTENSION_TO_LANGUAGE[ext] || 'plaintext'
  }

  private static shouldIncludeFile(path: string, size?: number): boolean {
    // Check file size
    if (size && size > MAX_FILE_SIZE) return false

    // Check if in ignored directory
    const parts = path.split('/')
    for (const part of parts) {
      if (IGNORED_DIRS.includes(part.toLowerCase())) return false
    }

    // Check if ignored file
    const fileName = parts[parts.length - 1] || ''
    if (IGNORED_FILES.includes(fileName)) return false
    if (IGNORED_FILES.includes(fileName.toLowerCase())) return false

    // Check extension
    const ext = this.getFileExtension(path)
    return CODE_EXTENSIONS.includes(ext) || ext === '.dockerfile' || ext === '.env'
  }

  private static getFilePriority(path: string): number {
    // Higher priority = more important file
    for (let i = 0; i < PRIORITY_PATTERNS.length; i++) {
      if (PRIORITY_PATTERNS[i]?.test(path)) {
        return PRIORITY_PATTERNS.length - i
      }
    }
    return 0
  }

  private static detectTech(files: string[], packageJson?: any): string {
    // Check package.json dependencies
    if (packageJson) {
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      }
      
      for (const [keyword, tech] of Object.entries(TECH_DETECTION)) {
        for (const dep of Object.keys(deps || {})) {
          if (dep.toLowerCase().includes(keyword)) {
            return tech
          }
        }
      }
    }

    // Detect by file patterns
    const hasTypescript = files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))
    const hasPython = files.some(f => f.endsWith('.py'))
    const hasJava = files.some(f => f.endsWith('.java'))
    const hasGo = files.some(f => f.endsWith('.go'))

    if (files.some(f => f.includes('next.config'))) return 'Next.js'
    if (files.some(f => f.endsWith('.vue'))) return 'Vue.js'
    if (files.some(f => f.endsWith('.svelte'))) return 'Svelte'
    if (files.some(f => f.includes('angular.json'))) return 'Angular'
    
    if (hasTypescript) return 'TypeScript'
    if (hasPython) return 'Python'
    if (hasJava) return 'Java'
    if (hasGo) return 'Go'

    return 'General'
  }

  private static detectMainLanguage(files: string[]): string {
    const counts: Record<string, number> = {}
    
    for (const file of files) {
      const ext = this.getFileExtension(file)
      const lang = this.getLanguageFromExtension(ext)
      counts[lang] = (counts[lang] || 0) + 1
    }

    // Find most common language (excluding json, markdown, etc.)
    const codeLangs = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'ruby', 'php', 'c', 'cpp', 'csharp', 'swift']
    let maxCount = 0
    let mainLang = 'typescript'

    for (const lang of codeLangs) {
      if ((counts[lang] || 0) > maxCount) {
        maxCount = counts[lang] || 0
        mainLang = lang
      }
    }

    return mainLang
  }

  private static groupFilesByComponent(files: GithubTreeItem[]): Map<string, GithubTreeItem[]> {
    const groups = new Map<string, GithubTreeItem[]>()
    
    // Sort files by priority (most important first)
    const sortedFiles = [...files].sort((a, b) => {
      return this.getFilePriority(b.path) - this.getFilePriority(a.path)
    })
    
    for (const file of sortedFiles) {
      if (file.type !== 'blob') continue
      if (!this.shouldIncludeFile(file.path, file.size)) continue

      // Get the directory and base name
      const parts = file.path.split('/')
      const fileName = parts.pop() || ''
      const dirPath = parts.join('/')
      
      // Extract base name without extension (e.g., "Button" from "Button.tsx")
      const baseName = fileName.replace(/\.(test|spec|stories|styles?|module)?\.[^.]+$/, '')
      
      // Group key: directory + base name
      const groupKey = dirPath ? `${dirPath}/${baseName}` : baseName
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(file)
    }

    return groups
  }

  // ================================================
  // MAIN PROCESSING
  // ================================================

  static async processRepoToCards(
    url: string, 
    token?: string
  ): Promise<{ cards: CreateCardFeatureRequest[], filesProcessed: number }> {
    console.log(`[GitHub Import] ========================================`)
    console.log(`[GitHub Import] Iniciando importação ILIMITADA de ${url}`)
    console.log(`[GitHub Import] Token fornecido: ${token ? 'SIM (5000 req/hora)' : 'NÃO (60 req/hora)'}`)
    console.log(`[GitHub Import] ========================================`)
    
    // Reset rate limit flag
    rateLimitHit = false
    
    // Get all files in the repo
    const tree = await this.getRepoTree(url, token)
    console.log(`[GitHub Import] Árvore obtida: ${tree.length} itens total`)
    
    // Filtrar arquivos de código (SEM LIMITE)
    const codeFiles = tree.filter(item => 
      item.type === 'blob' && this.shouldIncludeFile(item.path, item.size)
    )
    console.log(`[GitHub Import] Arquivos de código encontrados: ${codeFiles.length}`)

    if (codeFiles.length === 0) {
      throw new Error('Nenhum arquivo de código encontrado no repositório.')
    }

    // Try to get package.json for tech detection
    let packageJson: any = null
    const packageJsonFile = tree.find(f => f.path === 'package.json')
    if (packageJsonFile) {
      try {
        const content = await this.getFileContent(url, 'package.json', token)
        if (content) {
          packageJson = JSON.parse(content)
        }
        await sleep(REQUEST_DELAY)
      } catch (e: any) {
        console.log('[GitHub Import] Não foi possível ler package.json, continuando...')
        if (e.message?.includes('rate') || e.message?.includes('Limite')) {
          rateLimitHit = false // Reset - package.json não é crítico
        }
      }
    }

    // Detect tech and language
    const allPaths = codeFiles.map(f => f.path)
    const tech = this.detectTech(allPaths, packageJson)
    const mainLanguage = this.detectMainLanguage(allPaths)
    console.log(`[GitHub Import] Tech: ${tech}, Linguagem: ${mainLanguage}`)

    // Group files by component/module (SEM LIMITE)
    const groups = this.groupFilesByComponent(codeFiles)
    console.log(`[GitHub Import] Grupos/Cards a criar: ${groups.size}`)
    
    const cards: CreateCardFeatureRequest[] = []
    let filesProcessed = 0
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 10

    // Process ALL groups
    const groupEntries = Array.from(groups.entries())
    const totalGroups = groupEntries.length
    
    for (let i = 0; i < groupEntries.length; i++) {
      const [groupKey, groupFiles] = groupEntries[i]
      
      // Parar apenas se rate limit ou muitos erros consecutivos
      if (rateLimitHit) {
        console.log(`[GitHub Import] Rate limit atingido após ${filesProcessed} arquivos`)
        break
      }
      
      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.log(`[GitHub Import] Muitos erros consecutivos (${consecutiveErrors}), parando`)
        break
      }

      // Log de progresso a cada 10 grupos
      if (i % 10 === 0) {
        console.log(`[GitHub Import] Progresso: ${i}/${totalGroups} grupos (${filesProcessed} arquivos)`)
      }

      // Processar TODOS os arquivos do grupo (sem limite por card)
      const screens: CardFeatureScreen[] = []
      
      for (const file of groupFiles) {
        if (rateLimitHit) break
        
        try {
          const content = await this.getFileContent(url, file.path, token)
          
          if (!content) {
            continue
          }

          const ext = this.getFileExtension(file.path)
          const language = this.getLanguageFromExtension(ext)
          const fileName = file.path.split('/').pop() || file.path

          const block: ContentBlock = {
            id: randomUUID(),
            type: ContentType.CODE,
            content: content,
            language: language,
            title: fileName,
            order: screens.length
          }

          screens.push({
            name: fileName,
            description: `Arquivo ${fileName}`,
            route: file.path,
            blocks: [block]
          })

          filesProcessed++
          consecutiveErrors = 0 // Reset contador de erros
          
          // Delay mínimo entre arquivos
          await sleep(REQUEST_DELAY)
          
        } catch (error: any) {
          consecutiveErrors++
          console.error(`[GitHub Import] Erro em ${file.path}: ${error.message}`)
          
          if (error.message?.includes('rate') || error.message?.includes('Limite')) {
            rateLimitHit = true
            break
          }
        }
      }

      if (screens.length === 0) continue

      // Create card for this group
      const groupName = groupKey.split('/').pop() || groupKey
      const cardTitle = groupName.charAt(0).toUpperCase() + groupName.slice(1)

      cards.push({
        title: cardTitle,
        tech: tech,
        language: mainLanguage,
        description: `Importado de ${groupKey}`,
        content_type: ContentType.CODE,
        card_type: CardType.CODIGOS,
        screens: screens
      })
    }

    console.log(`[GitHub Import] ========================================`)
    console.log(`[GitHub Import] RESULTADO: ${cards.length} cards, ${filesProcessed} arquivos`)
    console.log(`[GitHub Import] Rate limit: ${rateLimitHit ? 'SIM' : 'NÃO'}`)
    console.log(`[GitHub Import] ========================================`)

    // Retorna o que conseguiu, mesmo se parcial
    if (cards.length > 0) {
      return { cards, filesProcessed }
    }

    // Se não conseguiu nada
    if (rateLimitHit) {
      throw new Error('Limite de requisições do GitHub atingido. Use um token de acesso pessoal para aumentar o limite (60 → 5000 req/hora).')
    }
    
    throw new Error('Não foi possível processar os arquivos do repositório.')
  }
}
