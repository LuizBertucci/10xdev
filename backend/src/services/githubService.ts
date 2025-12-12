import axios from 'axios'
import AdmZip from 'adm-zip'
import type { GithubRepoInfo } from '@/types/project'
import { ContentType, CardType } from '@/types/cardfeature'
import type { 
  CreateCardFeatureRequest, 
  CardFeatureScreen, 
  ContentBlock
} from '@/types/cardfeature'
import { randomUUID } from 'crypto'

// ================================================
// CONFIGURATION - SEM LIMITES
// ================================================

// Tamanho máximo de arquivo (10MB - praticamente ilimitado)
const MAX_FILE_SIZE = 10 * 1024 * 1024

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
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.venv', 'venv', '.idea', '.vscode', 'coverage', '.cache', '.turbo',
  'vendor', '.yarn', '.pnpm', 'out', '.output', 'target', 'bin', 'obj',
  '__tests__', '__mocks__', 'test', 'tests', 'spec', 'specs', 'e2e',
  'cypress', 'playwright', '.github', '.husky', 'docs', 'documentation',
  'examples', 'example', 'demo', 'demos', 'fixtures', 'mocks',
  'storybook', '.storybook', '.vercel', '.netlify'
]

// Arquivos a ignorar
const IGNORED_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store',
  'thumbs.db', '.gitignore', '.gitattributes', '.npmrc', '.nvmrc',
  '.prettierrc', '.prettierignore', '.eslintrc', '.eslintrc.js',
  '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs',
  'tsconfig.json', 'tsconfig.node.json', 'jsconfig.json',
  'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
  'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.mjs',
  'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js',
  'postcss.config.mjs', '.env.example', '.env.local', '.env.development',
  '.env.production', 'LICENSE', 'LICENSE.md', 'CHANGELOG.md',
  'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.editorconfig'
]

// Mapeamento de extensão para linguagem
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

// Mapeamento para detecção de tech
const TECH_DETECTION: Record<string, string> = {
  'react': 'React', 'next': 'Next.js', 'vue': 'Vue.js',
  'angular': 'Angular', 'svelte': 'Svelte', 'express': 'Express',
  'fastify': 'Fastify', 'nest': 'NestJS', 'django': 'Django',
  'flask': 'Flask', 'fastapi': 'FastAPI', 'spring': 'Spring', 'rails': 'Rails'
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
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': '10xDev-App'
    }
    if (token) {
      headers['Authorization'] = `token ${token}`
    }
    return headers
  }

  // ================================================
  // REPO INFO (1 requisição apenas)
  // ================================================

  static async getRepoDetails(url: string, token?: string): Promise<GithubRepoInfo> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) {
      throw new Error('URL do GitHub inválida. Use o formato: https://github.com/usuario/repositorio')
    }

    try {
      const headers = this.getHeaders(token)
      const response = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`,
        { headers, timeout: 15000 }
      )

      return {
        name: response.data.name,
        description: response.data.description,
        url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
        isPrivate: response.data.private
      }
    } catch (error: any) {
      console.error('[GitHub] Erro ao buscar repo:', error.response?.status, error.message)
      
      if (error.response?.status === 404) {
        throw new Error('Repositório não encontrado. Verifique a URL.')
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        if (error.response?.headers?.['x-ratelimit-remaining'] === '0') {
          throw new Error('Limite de requisições do GitHub atingido. Aguarde alguns minutos ou use um token.')
        }
        throw new Error('Sem permissão. Se for privado, adicione um token de acesso.')
      }
      throw new Error(`Erro ao acessar GitHub: ${error.message}`)
    }
  }

  // ================================================
  // DOWNLOAD ZIP (1 requisição apenas!)
  // ================================================

  private static async downloadRepoAsZip(url: string, token?: string): Promise<Buffer> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) {
      throw new Error('URL do GitHub inválida')
    }

    // Primeiro, descobrir o branch padrão
    let defaultBranch = 'main'
    try {
      const headers = this.getHeaders(token)
      const repoResponse = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`,
        { headers, timeout: 15000 }
      )
      defaultBranch = repoResponse.data.default_branch || 'main'
    } catch {
      // Se falhar, tenta main, depois master
      console.log('[GitHub] Não conseguiu obter branch padrão, tentando main/master')
    }

    // URL de download do ZIP (não usa rate limit da API!)
    const zipUrls = [
      `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/${defaultBranch}.zip`,
      `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/main.zip`,
      `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/master.zip`
    ]

    const headers: Record<string, string> = {
      'User-Agent': '10xDev-App'
    }
    if (token) {
      headers['Authorization'] = `token ${token}`
    }

    for (const zipUrl of zipUrls) {
      try {
        console.log(`[GitHub] Baixando ZIP de: ${zipUrl}`)
        const response = await axios.get(zipUrl, {
          headers,
          responseType: 'arraybuffer',
          timeout: 600000, // 10 minutos para downloads muito grandes
          maxContentLength: 500 * 1024 * 1024 // 500MB max
        })
        
        console.log(`[GitHub] ZIP baixado: ${(response.data.length / 1024 / 1024).toFixed(2)}MB`)
        return Buffer.from(response.data)
      } catch (error: any) {
        console.log(`[GitHub] Falha em ${zipUrl}: ${error.message}`)
        continue
      }
    }

    throw new Error('Não foi possível baixar o repositório. Verifique se é público ou adicione um token.')
  }

  // ================================================
  // EXTRACT & PROCESS ZIP
  // ================================================

  private static extractFilesFromZip(zipBuffer: Buffer): FileEntry[] {
    const zip = new AdmZip(zipBuffer)
    const entries = zip.getEntries()
    const files: FileEntry[] = []

    console.log(`[GitHub] Extraindo ${entries.length} entradas do ZIP...`)

    for (const entry of entries) {
      // Ignorar diretórios
      if (entry.isDirectory) continue

      // Remover o prefixo do diretório raiz (repo-branch/)
      const pathParts = entry.entryName.split('/')
      pathParts.shift() // Remove primeiro elemento (nome-branch)
      const relativePath = pathParts.join('/')

      if (!relativePath) continue

      // Verificar se deve incluir
      if (!this.shouldIncludeFile(relativePath)) continue

      // Verificar tamanho
      if (entry.header.size > MAX_FILE_SIZE) {
        console.log(`[GitHub] Ignorando arquivo grande: ${relativePath} (${(entry.header.size / 1024).toFixed(0)}KB)`)
        continue
      }

      try {
        const content = entry.getData().toString('utf-8')
        files.push({
          path: relativePath,
          content,
          size: entry.header.size
        })
      } catch {
        // Arquivo binário ou encoding inválido
        continue
      }
    }

    console.log(`[GitHub] ${files.length} arquivos de código extraídos`)
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
    
    // Verificar diretórios ignorados
    for (const part of parts) {
      if (IGNORED_DIRS.includes(part.toLowerCase())) return false
    }

    // Verificar arquivos ignorados
    const fileName = parts[parts.length - 1] || ''
    if (IGNORED_FILES.includes(fileName)) return false
    if (IGNORED_FILES.includes(fileName.toLowerCase())) return false

    // Verificar extensão
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

    const codeLangs = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'ruby', 'php']
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

  private static groupFilesByComponent(files: FileEntry[]): Map<string, FileEntry[]> {
    const groups = new Map<string, FileEntry[]>()
    
    for (const file of files) {
      const parts = file.path.split('/')
      const fileName = parts.pop() || ''
      const dirPath = parts.join('/')
      
      // Agrupar por diretório + nome base
      const baseName = fileName.replace(/\.(test|spec|stories|styles?|module)?\.[^.]+$/, '')
      const groupKey = dirPath ? `${dirPath}/${baseName}` : baseName
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(file)
    }

    return groups
  }

  // ================================================
  // MAIN PROCESSING - VIA ZIP (SEM RATE LIMIT!)
  // ================================================

  static async processRepoToCards(
    url: string, 
    token?: string
  ): Promise<{ cards: CreateCardFeatureRequest[], filesProcessed: number }> {
    console.log(`[GitHub] ========================================`)
    console.log(`[GitHub] Importando via ZIP: ${url}`)
    console.log(`[GitHub] ========================================`)
    
    // 1. Baixar ZIP do repositório (1 única requisição!)
    const zipBuffer = await this.downloadRepoAsZip(url, token)
    
    // 2. Extrair arquivos do ZIP (local, sem requisições)
    const files = this.extractFilesFromZip(zipBuffer)

    if (files.length === 0) {
      throw new Error('Nenhum arquivo de código encontrado no repositório.')
    }

    // 3. Detectar package.json para tech
    let packageJson: any = null
    const pkgFile = files.find(f => f.path === 'package.json')
    if (pkgFile) {
      try {
        packageJson = JSON.parse(pkgFile.content)
      } catch { /* ignore */ }
    }

    // 4. Detectar tech e linguagem
    const tech = this.detectTech(files, packageJson)
    const mainLanguage = this.detectMainLanguage(files)
    console.log(`[GitHub] Tech: ${tech}, Linguagem: ${mainLanguage}`)

    // 5. Agrupar arquivos
    const groups = this.groupFilesByComponent(files)
    console.log(`[GitHub] ${groups.size} grupos/cards a criar`)

    // 6. Criar cards (tudo local, sem requisições!)
    const cards: CreateCardFeatureRequest[] = []
    let filesProcessed = 0

    for (const [groupKey, groupFiles] of groups) {
      const screens: CardFeatureScreen[] = []

      for (const file of groupFiles) {
        const ext = this.getFileExtension(file.path)
        const language = this.getLanguageFromExtension(ext)
        const fileName = file.path.split('/').pop() || file.path

        const block: ContentBlock = {
          id: randomUUID(),
          type: ContentType.CODE,
          content: file.content,
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
      }

      if (screens.length === 0) continue

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

    console.log(`[GitHub] ========================================`)
    console.log(`[GitHub] RESULTADO: ${cards.length} cards, ${filesProcessed} arquivos`)
    console.log(`[GitHub] ========================================`)

    if (cards.length === 0) {
      throw new Error('Não foi possível processar os arquivos do repositório.')
    }

    return { cards, filesProcessed }
  }
}
