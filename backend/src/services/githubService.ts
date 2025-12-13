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
import { AiCardGroupingService } from '@/services/aiCardGroupingService'

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

// ================================================
// FEATURE DETECTION PATTERNS
// ================================================

// Padrões para identificar camadas de arquivos
const LAYER_PATTERNS = {
  // Backend
  routes: /\/(routes?|routers?)\//i,
  controllers: /\/(controllers?)\//i,
  services: /\/(services?)\//i,
  models: /\/(models?)\//i,
  middlewares: /\/(middlewares?)\//i,
  validators: /\/(validators?|validations?)\//i,
  // Frontend
  hooks: /\/(hooks?)\//i,
  components: /\/(components?)\//i,
  pages: /\/(pages?|app)\//i,
  stores: /\/(stores?|state)\//i,
  api: /\/(api|services?)\//i,
  utils: /\/(utils?|helpers?|lib)\//i,
  types: /\/(types?|interfaces?)\//i,
}

// Mapeamento de layer para nome de screen
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
}

interface FeatureFile extends FileEntry {
  layer: string
  featureName: string
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

  // ================================================
  // FEATURE DETECTION & GROUPING
  // ================================================

  /**
   * Detecta a qual "layer" um arquivo pertence (routes, controllers, hooks, etc)
   */
  private static detectFileLayer(path: string): string {
    for (const [layer, pattern] of Object.entries(LAYER_PATTERNS)) {
      if (pattern.test(path)) return layer
    }
    return 'other'
  }

  /**
   * Extrai o nome da feature/entidade de um arquivo
   * Ex: "teamController.ts" -> "team"
   * Ex: "useGrupos.ts" -> "grupos"
   * Ex: "CardFeatureModel.ts" -> "cardfeature"
   */
  private static extractFeatureName(path: string): string {
    const fileName = path.split('/').pop() || ''
    let baseName = fileName
      .replace(/\.(ts|tsx|js|jsx|py|java|go|rb|php|vue|svelte)$/i, '')
      .replace(/\.(test|spec|stories|styles?|module)$/i, '')
    
    // Remove sufixos comuns
    const suffixes = [
      'Controller', 'Service', 'Model', 'Routes', 'Router',
      'Validator', 'Middleware', 'Hook', 'Component', 'Page',
      'Store', 'Slice', 'Api', 'Service', 'Utils', 'Helper',
      'Type', 'Interface', 'Schema', 'Dto', 'Entity'
    ]
    
    for (const suffix of suffixes) {
      const regex = new RegExp(`${suffix}s?$`, 'i')
      if (regex.test(baseName)) {
        baseName = baseName.replace(regex, '')
        break
      }
    }
    
    // Remove prefixos comuns
    if (baseName.toLowerCase().startsWith('use')) {
      baseName = baseName.substring(3)
    }
    
    // Normaliza para lowercase para matching
    return baseName.toLowerCase().replace(/[^a-z0-9]/g, '')
  }

  /**
   * Detecta funcionalidades/features agrupando arquivos relacionados
   * de diferentes camadas (routes + controller + service + model + hooks + components)
   */
  private static groupFilesByFeature(files: FileEntry[]): Map<string, FeatureFile[]> {
    // Primeiro, analisa todos os arquivos e extrai feature names
    const analyzedFiles: FeatureFile[] = files.map(file => ({
      ...file,
      layer: this.detectFileLayer(file.path),
      featureName: this.extractFeatureName(file.path)
    }))

    // Agrupa por feature name
    const featureGroups = new Map<string, FeatureFile[]>()
    
    for (const file of analyzedFiles) {
      // Ignora arquivos genéricos ou de configuração
      if (!file.featureName || file.featureName.length < 2) {
        // Para arquivos sem nome de feature claro, usa o diretório pai
        const parts = file.path.split('/')
        if (parts.length > 1) {
          file.featureName = parts[parts.length - 2]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'misc'
        } else {
          file.featureName = 'misc'
        }
      }
      
      if (!featureGroups.has(file.featureName)) {
        featureGroups.set(file.featureName, [])
      }
      featureGroups.get(file.featureName)!.push(file)
    }

    // Consolida features muito pequenas ou relacionadas
    return this.consolidateFeatures(featureGroups)
  }

  /**
   * Consolida features pequenas e agrupa features relacionadas
   */
  private static consolidateFeatures(groups: Map<string, FeatureFile[]>): Map<string, FeatureFile[]> {
    const consolidated = new Map<string, FeatureFile[]>()
    const MIN_FILES_FOR_FEATURE = 2
    
    // Features que são grandes o suficiente ficam separadas
    const largeFeatures = new Map<string, FeatureFile[]>()
    const smallFiles: FeatureFile[] = []
    
    for (const [name, files] of groups) {
      // Uma feature é "completa" se tem múltiplas camadas ou múltiplos arquivos
      const layers = new Set(files.map(f => f.layer))
      const hasMultipleLayers = layers.size >= 2
      const hasEnoughFiles = files.length >= MIN_FILES_FOR_FEATURE
      
      if (hasMultipleLayers || hasEnoughFiles) {
        largeFeatures.set(name, files)
      } else {
        smallFiles.push(...files)
      }
    }

    // Adiciona features grandes
    for (const [name, files] of largeFeatures) {
      consolidated.set(name, files)
    }

    // Agrupa arquivos pequenos por diretório principal
    if (smallFiles.length > 0) {
      const byDir = new Map<string, FeatureFile[]>()
      for (const file of smallFiles) {
        const mainDir = file.path.split('/')[0] || 'root'
        if (!byDir.has(mainDir)) {
          byDir.set(mainDir, [])
        }
        byDir.get(mainDir)!.push(file)
      }
      
      for (const [dir, files] of byDir) {
        const existingKey = `${dir}-utils`
        consolidated.set(existingKey, files)
      }
    }

    return consolidated
  }

  /**
   * Gera um título descritivo para a feature
   */
  private static generateFeatureTitle(featureName: string, files: FeatureFile[]): string {
    // Capitaliza o nome
    const capitalized = featureName.charAt(0).toUpperCase() + featureName.slice(1)
    
    // Detecta o tipo de sistema baseado nas camadas presentes
    const layers = new Set(files.map(f => f.layer))
    const hasBackend = layers.has('routes') || layers.has('controllers') || layers.has('services') || layers.has('models')
    const hasFrontend = layers.has('hooks') || layers.has('components') || layers.has('pages')
    
    if (hasBackend && hasFrontend) {
      return `Sistema de ${capitalized}`
    } else if (hasBackend) {
      return `API de ${capitalized}`
    } else if (hasFrontend) {
      return `UI de ${capitalized}`
    }
    
    return capitalized
  }

  /**
   * Gera uma descrição para a feature baseada nos arquivos
   */
  private static generateFeatureDescription(featureName: string, files: FeatureFile[]): string {
    const layers = [...new Set(files.map(f => f.layer))].filter(l => l !== 'other')
    const layerNames = layers.map(l => LAYER_TO_SCREEN_NAME[l] || l).join(', ')
    
    if (layers.length > 0) {
      return `Módulo ${featureName} contendo: ${layerNames}`
    }
    return `Arquivos relacionados a ${featureName}`
  }

  // ================================================
  // MAIN PROCESSING - VIA ZIP (SEM RATE LIMIT!)
  // ================================================

  static async processRepoToCards(
    url: string, 
    token?: string,
    options?: { useAi?: boolean }
  ): Promise<{ cards: CreateCardFeatureRequest[], filesProcessed: number, aiUsed: boolean, aiCardsCreated: number }> {
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

    // 5. Agrupar arquivos POR FUNCIONALIDADE
    const featureGroups = this.groupFilesByFeature(files)
    console.log(`[GitHub] ${featureGroups.size} features/cards detectadas`)

    // 6. Se habilitado, pedir para IA refinar (processa o repo "todo" por partes, por feature)
    const useAiRequested = options?.useAi === true
    const useAi = useAiRequested && AiCardGroupingService.isEnabled() && AiCardGroupingService.hasConfig()
    if (useAi) {
      console.log(`[GitHub][AI] IA habilitada por request (modo=${AiCardGroupingService.mode()}). Refinando cards por feature...`)
    } else if (useAiRequested) {
      console.log(`[GitHub][AI] IA solicitada, mas desabilitada/não configurada. Usando heurística (sem IA).`)
    }

    // 7. Criar cards organizados por funcionalidade (heurístico + opcional IA)
    const cards: CreateCardFeatureRequest[] = []
    let filesProcessed = 0
    let aiCardsCreated = 0

    for (const [featureName, featureFiles] of featureGroups) {
      // --- AI path (por feature) ---
      if (useAi) {
        try {
          const mode = AiCardGroupingService.mode()

          // Monta metadados + (snippet | conteúdo completo) para a IA
          const fileMetas = featureFiles.map((f) => ({
            path: f.path,
            layer: f.layer,
            featureName: f.featureName,
            size: f.size,
            snippet: mode === 'full' ? f.content : this.makeSnippet(f.content),
          }))

          const proposedGroups = [{ key: featureName, files: featureFiles.map(f => f.path) }]
          const ai = await AiCardGroupingService.refineGrouping({
            repoUrl: url,
            detectedTech: tech,
            detectedLanguage: mainLanguage,
            files: fileMetas,
            proposedGroups,
          })

          // A resposta pode ter 1+ cards, mas aqui esperamos 1 (feature)
          for (const aiCard of ai.cards) {
            const screens: CardFeatureScreen[] = []
            for (const s of aiCard.screens) {
              const blocks: ContentBlock[] = []
              for (const filePath of s.files) {
                const file = featureFiles.find((ff) => ff.path === filePath)
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
                  order: blocks.length
                })
                filesProcessed++
              }

              if (blocks.length === 0) continue
              screens.push({
                name: s.name,
                description: '',
                route: s.files[0] || '',
                blocks
              })
            }

            if (screens.length === 0) continue
            cards.push({
              title: aiCard.title,
              description: aiCard.description || '',
              tech: aiCard.tech || tech,
              language: aiCard.language || mainLanguage,
              content_type: ContentType.CODE,
              card_type: CardType.CODIGOS,
              screens
            })
            aiCardsCreated++
          }

          // Se a IA gerou algo, pula heurística dessa feature
          if (ai.cards.length > 0) continue
        } catch (e: any) {
          console.warn(`[GitHub][AI] Falha ao refinar feature "${featureName}". Usando fallback heurístico.`, e?.message || e)
        }
      }

      // Agrupa arquivos da feature por layer para criar screens organizadas
      const filesByLayer = new Map<string, FeatureFile[]>()
      
      for (const file of featureFiles) {
        const layer = file.layer
        if (!filesByLayer.has(layer)) {
          filesByLayer.set(layer, [])
        }
        filesByLayer.get(layer)!.push(file)
      }

      const screens: CardFeatureScreen[] = []
      
      // Ordem de prioridade das layers para organização visual
      const layerOrder = [
        'routes', 'controllers', 'services', 'models', 'middlewares', 'validators',
        'hooks', 'api', 'stores', 'components', 'pages',
        'types', 'utils', 'other'
      ]

      for (const layer of layerOrder) {
        const layerFiles = filesByLayer.get(layer)
        if (!layerFiles || layerFiles.length === 0) continue

        // Se há múltiplos arquivos na mesma layer, cria uma screen com múltiplos blocos
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
            language: language,
            title: fileName,
            order: blocks.length
          })

          filesProcessed++
        }

        // Descrição baseada nos arquivos da screen
        const fileNames = layerFiles.map(f => f.path.split('/').pop()).join(', ')
        
        screens.push({
          name: screenName,
          description: layerFiles.length === 1 
            ? `Arquivo ${fileNames}` 
            : `Arquivos: ${fileNames}`,
          route: layerFiles[0]?.path || '',
          blocks: blocks
        })
      }

      if (screens.length === 0) continue

      // Gera título e descrição inteligentes
      const cardTitle = this.generateFeatureTitle(featureName, featureFiles)
      const cardDescription = this.generateFeatureDescription(featureName, featureFiles)

      cards.push({
        title: cardTitle,
        tech: tech,
        language: mainLanguage,
        description: cardDescription,
        content_type: ContentType.CODE,
        card_type: CardType.CODIGOS,
        screens: screens
      })
    }

    // Ordena cards por número de screens (mais completos primeiro)
    cards.sort((a, b) => (b.screens?.length || 0) - (a.screens?.length || 0))

    console.log(`[GitHub] ========================================`)
    console.log(`[GitHub] RESULTADO: ${cards.length} cards, ${filesProcessed} arquivos`)
    console.log(`[GitHub] Features detectadas: ${[...featureGroups.keys()].join(', ')}`)
    console.log(`[GitHub] ========================================`)

    if (cards.length === 0) {
      throw new Error('Não foi possível processar os arquivos do repositório.')
    }

    return { cards, filesProcessed, aiUsed: aiCardsCreated > 0, aiCardsCreated }
  }

  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private static makeSnippet(content: string): string {
    // snippet simples (primeiras linhas) para modo metadata
    const maxChars = 1200
    const s = content.slice(0, maxChars)
    return s
  }
}
