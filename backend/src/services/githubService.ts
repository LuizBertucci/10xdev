import axios from 'axios'
import AdmZip from 'adm-zip'
import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { GithubRepoInfo } from '@/types/project'
import type { MacroCategory } from '@/types/MacroCategory'
import { CardType, ContentType, Visibility } from '@/types/cardfeature'
import type { CardFeatureScreen, ContentBlock, CreateCardFeatureRequest } from '@/types/cardfeature'
import { AiCardGroupingService } from '@/services/aiCardGroupingService'
import { CardQualitySupervisor } from '@/services/cardQualitySupervisor'
import { validateCard } from '@/services/cardValidation'
import { FEATURE_TITLES } from '@/constants/featureSemantics'
import { normalizeTag, normalizeTags } from '@/utils/tagNormalization'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export interface FileExclusionMetrics {
  bySize: number
  byIgnoredDir: number
  byIgnoredFile: number
  byUnsupportedExtension: number
  byReadError: number
  totalSkipped: number
  samplePaths: string[]
}

// ================================================
// CONFIGURATION
// ================================================

function getMaxFileSizeBytes(): number {
  const mb = Number(process.env.GITHUB_IMPORT_MAX_FILE_SIZE_MB)
  if (mb > 0) return mb * 1024 * 1024
  const bytes = Number(process.env.GITHUB_IMPORT_MAX_FILE_SIZE_BYTES)
  if (bytes > 0) return bytes
  return 10 * 1024 * 1024 // 10MB default
}

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

const IGNORED_DIRS_BASE = [
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.venv', 'venv', '.idea', '.vscode', 'coverage', '.cache', '.turbo',
  'vendor', '.yarn', '.pnpm', 'out', '.output', 'target', 'bin', 'obj',
  '.husky'
]

const IGNORED_DIRS_OPTIONAL = {
  tests: ['__tests__', '__mocks__', 'test', 'tests', 'spec', 'specs', 'e2e', 'cypress', 'playwright'],
  workflows: ['.github']
}

const IGNORED_FILES_BASE = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store',
  'thumbs.db', '.gitignore', '.gitattributes', '.npmrc', '.nvmrc',
  '.prettierrc', '.prettierignore', '.env.example', '.env.local', '.env.development',
  '.env.production', 'LICENSE', 'LICENSE.md', 'CHANGELOG.md',
  'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.editorconfig'
]

const IGNORED_FILES_CONFIG_OPTIONAL = [
  '.eslintrc', '.eslintrc.js', '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs',
  'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
  'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.mjs',
  'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js', 'postcss.config.mjs'
]

function getIgnoredDirs(): string[] {
  const dirs = [...IGNORED_DIRS_BASE]
  if (process.env.GITHUB_IMPORT_INCLUDE_TESTS !== 'true') {
    dirs.push(...IGNORED_DIRS_OPTIONAL.tests)
  }
  if (process.env.GITHUB_IMPORT_INCLUDE_WORKFLOWS !== 'true') {
    dirs.push(...IGNORED_DIRS_OPTIONAL.workflows)
  }
  const extra = process.env.GITHUB_IMPORT_IGNORED_DIRS?.split(',').map(s => s.trim()).filter(Boolean)
  if (extra?.length) dirs.push(...extra)
  return dirs
}

function getIgnoredFiles(): string[] {
  const files = [...IGNORED_FILES_BASE]
  if (process.env.GITHUB_IMPORT_INCLUDE_CONFIGS !== 'true') {
    files.push(...IGNORED_FILES_CONFIG_OPTIONAL)
  }
  const extra = process.env.GITHUB_IMPORT_IGNORED_FILES?.split(',').map(s => s.trim()).filter(Boolean)
  if (extra?.length) files.push(...extra)
  return files
}

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

  /** Retorna motivo da exclusão ou null se o arquivo deve ser incluído. */
  private static getSkipReason(
    relativePath: string,
    ignoredDirs: string[],
    ignoredFiles: string[]
  ): { reason: 'ignored_dir' | 'ignored_file' | 'unsupported_extension'; path: string } | null {
    const parts = relativePath.split('/')
    const dirsLower = new Set(ignoredDirs.map(d => d.toLowerCase()))
    for (const part of parts) {
      if (dirsLower.has(part.toLowerCase())) {
        return { reason: 'ignored_dir', path: relativePath }
      }
    }
    const fileName = parts[parts.length - 1] || ''
    if (ignoredFiles.includes(fileName)) {
      return { reason: 'ignored_file', path: relativePath }
    }
    const ext = this.getFileExtension(relativePath)
    if (!CODE_EXTENSIONS.includes(ext)) {
      return { reason: 'unsupported_extension', path: relativePath }
    }
    return null
  }

  private static extractFilesFromZip(zipBuffer: Buffer): {
    files: FileEntry[]
    skippedPaths: string[]
    exclusionMetrics: FileExclusionMetrics
  } {
    const ignoredDirs = getIgnoredDirs()
    const ignoredFiles = getIgnoredFiles()
    const zip = new AdmZip(zipBuffer)
    const entries = zip.getEntries()
    const files: FileEntry[] = []
    const skippedPaths: string[] = []
    const metrics = {
      bySize: 0,
      byIgnoredDir: 0,
      byIgnoredFile: 0,
      byUnsupportedExtension: 0,
      byReadError: 0,
      totalSkipped: 0,
      samplePaths: [] as string[]
    }
    const maxSamplePaths = 20

    for (const entry of entries) {
      if (entry.isDirectory) continue
      const parts = entry.entryName.split('/')
      parts.shift()
      const relativePath = parts.join('/')
      if (!relativePath) continue

      const skipReason = this.getSkipReason(relativePath, ignoredDirs, ignoredFiles)
      if (skipReason) {
        if (skipReason.reason === 'ignored_dir') metrics.byIgnoredDir++
        else if (skipReason.reason === 'ignored_file') metrics.byIgnoredFile++
        else metrics.byUnsupportedExtension++
        skippedPaths.push(`${relativePath} (${skipReason.reason})`)
        if (metrics.samplePaths.length < maxSamplePaths) metrics.samplePaths.push(relativePath)
        continue
      }
      if (entry.header.size > getMaxFileSizeBytes()) {
        const includeAsMetadata = process.env.GITHUB_IMPORT_INCLUDE_LARGE_FILES_AS_METADATA === 'true'
        if (includeAsMetadata) {
          files.push({
            path: relativePath,
            content: `// Arquivo grande (${(entry.header.size / 1024).toFixed(0)}KB) - conteúdo omitido. Path: ${relativePath}`,
            size: entry.header.size
          })
        } else {
          metrics.bySize++
          skippedPaths.push(`${relativePath} (tamanho excede limite)`)
          if (metrics.samplePaths.length < maxSamplePaths) metrics.samplePaths.push(relativePath)
        }
        continue
      }
      try {
        const content = entry.getData().toString('utf-8')
        files.push({ path: relativePath, content, size: entry.header.size })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        metrics.byReadError++
        console.warn(`[GithubService] Arquivo ignorado: ${relativePath} - ${msg}`)
        skippedPaths.push(`${relativePath}: ${msg}`)
        if (metrics.samplePaths.length < maxSamplePaths) metrics.samplePaths.push(relativePath)
      }
    }

    metrics.totalSkipped = skippedPaths.length
    const exclusionMetrics: FileExclusionMetrics = { ...metrics }

    return { files, skippedPaths, exclusionMetrics }
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
    return this.getSkipReason(path, getIgnoredDirs(), getIgnoredFiles()) === null
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

  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private static makeSnippet(content: string): string {
    const max = Number(process.env.GITHUB_IMPORT_AI_MAX_CHARS_PER_FILE || 10000)
    return content.slice(0, max)
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
    featureFiles: Array<{ path: string; content: string; size: number }>,
    aiOverrides?: { title: string; description?: string; tech?: string; language?: string; category?: string; tags?: string[]; macro_category?: MacroCategory }
  ): CreateCardFeatureRequest {
    const category = aiOverrides?.category || FEATURE_TITLES[featureName] || this.capitalizeFirst(featureName)
    const card: CreateCardFeatureRequest = {
      title: aiOverrides ? cleanMarkdown(aiOverrides.title) : `Card ${featureName}`,
      description: aiOverrides?.description ? cleanMarkdown(aiOverrides.description) : `Arquivos: ${featureFiles.map(f => f.path.split('/').pop()).join(', ')}`,
      tech: aiOverrides?.tech || tech,
      language: aiOverrides?.language || lang,
      content_type: ContentType.CODE,
      card_type: CardType.CODIGOS,
      category,
      tags: aiOverrides?.tags || this.generateAutoTags(featureName, tech),
      visibility: Visibility.UNLISTED,
      screens
    }
    if (aiOverrides?.macro_category) {
      card.macro_category = aiOverrides.macro_category
    }
    return card
  }

  private static addSummaryScreen(card: CreateCardFeatureRequest): CreateCardFeatureRequest {
    const first = card.screens?.[0]?.name?.trim().toLowerCase()
    if (first === 'resumo') return card
    if (first === 'overview') {
      const screens = [...(card.screens || [])]
      if (screens[0]) screens[0] = { ...screens[0], name: 'Resumo' }
      return { ...card, screens }
    }

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

  // ================================================
  // MAIN PROCESSING
  // ================================================

  static async processRepoToCards(
    url: string,
    token?: string,
    options?: {
      useAi?: boolean
      onProgress?: (update: {
        step: string
        progress?: number
        message?: string
        cardEstimate?: number
        cardCount?: number
        exclusionMetrics?: FileExclusionMetrics
      }) => void
      onCardReady?: (card: CreateCardFeatureRequest) => Promise<void>
    }
  ): Promise<{
    cards: CreateCardFeatureRequest[]
    filesProcessed: number
    aiUsed: boolean
    aiCardsCreated: number
    filesSkipped?: number
    filesFailed?: number
    errorDetails?: string[]
    exclusionMetrics?: FileExclusionMetrics
  }> {
    const notify = (step: string, progress: number, message: string, extra?: { cardEstimate?: number; cardCount?: number }) =>
      options?.onProgress?.({ step, progress, message, ...extra })

    notify('downloading_zip', 5, 'Baixando o repositório do GitHub...')
    const zipBuffer = await this.downloadRepoAsZip(url, token)

    const { files, skippedPaths, exclusionMetrics } = this.extractFilesFromZip(zipBuffer)
    const filesSkipped = skippedPaths.length
    if (files.length === 0) {
      const hint = filesSkipped > 0 ? ` (${filesSkipped} arquivo(s) ignorado(s))` : ''
      throw new Error(`Nenhum arquivo de código encontrado no repositório.${hint}`)
    }
    const errorDetails: string[] = skippedPaths.length > 0 ? [...skippedPaths] : []
    if (exclusionMetrics.totalSkipped > 0 && options?.onProgress) {
      options.onProgress({
        step: 'extracting_files',
        progress: 10,
        message: `Extraídos ${files.length} arquivos (${exclusionMetrics.totalSkipped} excluídos)`,
        exclusionMetrics
      })
    }

    const totalFiles = files.length
    let filesProcessed = 0

    notify('extracting_files', 10, `Extraindo ${totalFiles} arquivos...`)

    let packageJson: PackageJson | undefined
    const pkg = files.find(f => f.path === 'package.json')
    if (pkg) { try { packageJson = JSON.parse(pkg.content) } catch { /* ignore */ } }

    const tech = this.detectTech(files, packageJson)
    const mainLanguage = this.detectMainLanguage(files)

    const useAi = options?.useAi === true && AiCardGroupingService.isEnabled() && AiCardGroupingService.hasConfig()
    if (!useAi) {
      throw new Error('Importação requer análise por IA. Configure as chaves da API e tente novamente.')
    }
    const estimatedCards = Math.max(10, Math.ceil(files.length / 10))

    notify('analyzing_repo', 20, `Tecnologia: ${tech}. Preparando análise para IA...`)

    const notifyProgress = (step: string, progress: number, message: string) => {
      options?.onProgress?.({ step, progress, message })
    }

    const pushQualityLog = (step: string, progress: number) => (message: string) => {
      const normalized = message.replace(/\s+/g, ' ').trim()
      if (!normalized) return
      notify(step, progress, normalized, { cardEstimate: estimatedCards, cardCount: cards.length })
    }

    let cards: CreateCardFeatureRequest[] = []
    let aiCardsCreated = 0

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
        `🤖 IA: enviando análise do repositório...`,
        { cardEstimate: estimatedCards })
      try {
        const mode = AiCardGroupingService.mode()
        // Arquivos crus: IA analisa e agrupa por regras no prompt (sem heurística prévia)
        const fileMetas = files.map(f => ({
          path: f.path,
          size: f.size,
          snippet: mode === 'full' ? f.content : this.makeSnippet(f.content)
        }))
        notify('generating_cards', 58, `🤖 IA: aguardando resposta...`, { cardEstimate: estimatedCards })
        const ai = await AiCardGroupingService.refineGrouping({
          repoUrl: url,
          detectedTech: tech,
          detectedLanguage: mainLanguage,
          files: fileMetas
        })
        notify('generating_cards', 62, `🤖 IA: resposta recebida, parseando...`, { cardEstimate: estimatedCards, cardCount: ai.cards.length })
        notify('generating_cards', 65,
          `✅ IA criou ${ai.cards.length} card(s) consolidados`,
          { cardEstimate: estimatedCards, cardCount: ai.cards.length })

        let skippedNoScreens = 0
        let skippedValidation = 0
        for (const aiCard of ai.cards) {
          const screens: CardFeatureScreen[] = []
          for (const s of aiCard.screens) {
            const blocks: ContentBlock[] = []
            const screenName = (s.name || '').trim().toLowerCase()
            const isSummaryScreen = screenName === 'resumo' || screenName === 'overview'
            for (const filePath of s.files || []) {
              const file = files.find(ff => ff.path === filePath)
              if (!file) continue
              blocks.push(this.fileToBlock(file, blocks.length))
              filesProcessed++
            }
            if (blocks.length === 0) {
              if (isSummaryScreen && s.description?.trim()) {
                blocks.push({
                  id: randomUUID(),
                  type: ContentType.TEXT,
                  content: cleanMarkdown(s.description),
                  order: 0
                })
              } else {
                continue
              }
            }
            screens.push({
              name: s.name || 'Resumo',
              description: cleanMarkdown(s.description || ''),
              route: s.files?.[0] || '',
              blocks
            })
          }
          if (screens.length === 0) {
            skippedNoScreens++
            continue
          }
          const aiOverrides: { title: string; description?: string; tech?: string; language?: string; category?: string; tags?: string[]; macro_category?: MacroCategory } = {
            title: aiCard.title,
            ...(aiCard.description != null && { description: aiCard.description }),
            ...(aiCard.tech != null && typeof aiCard.tech === 'string' && { tech: aiCard.tech }),
            ...(aiCard.language != null && typeof aiCard.language === 'string' && { language: aiCard.language }),
            ...(aiCard.category != null && { category: aiCard.category })
          }
          if (aiCard.tags && aiCard.tags.length > 0) aiOverrides.tags = aiCard.tags
          if (aiCard.macroCategory) aiOverrides.macro_category = aiCard.macroCategory
          const cardFiles = aiCard.screens.flatMap(s => s.files).map(fp => files.find(ff => ff.path === fp)).filter(Boolean) as Array<{ path: string; content: string; size: number }>
          const newCard = this.buildCard(aiCard.title.toLowerCase().replace(/\s+/g, ''), screens, tech, mainLanguage, cardFiles, aiOverrides)
          // Se a IA forneceu tags, normalizar para evitar duplicatas EN/PT
          if (aiCard.tags && aiCard.tags.length > 0) {
            newCard.tags = normalizeTags(aiCard.tags)
          }
          let cardWithSummary = this.addSummaryScreen(newCard)
          if (process.env.GITHUB_IMPORT_GENERATE_SUMMARY_AT_IMPORT === 'true') {
            try {
              const { summary } = await AiCardGroupingService.generateCardSummary({
                cardTitle: cardWithSummary.title,
                screens: cardWithSummary.screens.map(s => ({
                  name: s.name || '',
                  description: s.description || '',
                  blocks: s.blocks.map(b => {
                    const block: { type: ContentType; content: string; language?: string; title?: string; route?: string } = {
                      type: b.type,
                      content: b.content
                    }
                    if (b.language != null) block.language = b.language
                    if (b.title != null) block.title = b.title
                    if (b.route != null) block.route = b.route
                    return block
                  })
                })),
                ...(cardWithSummary.tech != null && { tech: cardWithSummary.tech }),
                ...(cardWithSummary.language != null && { language: cardWithSummary.language })
              })
              const resumoIdx = cardWithSummary.screens.findIndex(s =>
                (s.name || '').trim().toLowerCase() === 'resumo'
              )
              if (resumoIdx >= 0 && cardWithSummary.screens[resumoIdx]?.blocks?.[0]) {
                cardWithSummary = {
                  ...cardWithSummary,
                  screens: cardWithSummary.screens.map((scr, i) =>
                    i === resumoIdx
                      ? { ...scr, blocks: [{ ...scr.blocks[0]!, content: summary }] }
                      : scr
                  )
                }
              }
            } catch (summaryErr) {
              console.warn('[GithubService] generateCardSummary falhou, usando resumo existente:', summaryErr)
            }
          }
          const validation = validateCard(cardWithSummary)
          if (!validation.valid) {
            console.error('[GithubService] Card IA inválido (pulando):', validation.errors)
            skippedValidation++
            continue
          }
          await emitCard(cardWithSummary)
          aiCardsCreated++
          if (ai.cards.length > 0) {
            const pct = Math.floor(65 + (aiCardsCreated / ai.cards.length) * 15)
            notify('generating_cards', pct, `Criando cards: ${aiCardsCreated}/${ai.cards.length}`, { cardCount: aiCardsCreated })
          }
          if (totalFiles > 0) {
            const progress = Math.floor(30 + (filesProcessed / totalFiles) * 55)
            notifyProgress('generating_cards', progress, `${filesProcessed}/${totalFiles} arquivos processados`)
          }
        }
        console.log('[GithubService] DIAGNÓSTICO pipeline:', {
          aiCardsRecebidos: ai.cards.length,
          skippedNoScreens,
          skippedValidation,
          cardsEmitidos: cards.length,
          aiCardsCreated
        })
        // Após processar todos os cards da IA, adicionar Sumário e retornar
        cards.sort((a, b) => (b.screens?.length || 0) - (a.screens?.length || 0))
        const cardsBeforeSupervisor = cards.length
        // Qualidade check
        notify('quality_check', 80, '🔍 Supervisor de qualidade analisando cards...', { cardEstimate: estimatedCards, cardCount: cards.length })
        const qualityReport = CardQualitySupervisor.analyzeQuality(cards, {
          onLog: pushQualityLog('quality_check', 82),
          conservativeMode: process.env.GITHUB_IMPORT_SUPERVISOR_CONSERVATIVE === 'true'
        })
        if (qualityReport.issuesFound > 0) {
          notify('quality_corrections', 85, '🔧 Aplicando correções automáticas...', { cardEstimate: estimatedCards, cardCount: cards.length })
          const corrections = CardQualitySupervisor.applyCorrections(cards, qualityReport, {
            onLog: pushQualityLog('quality_corrections', 88)
          })
          cards = corrections.correctedCards
          console.log('[GithubService] DIAGNÓSTICO supervisor:', {
            cardsBeforeSupervisor,
            mergesApplied: corrections.mergesApplied,
            cardsRemoved: corrections.cardsRemoved,
            cardsDepois: cards.length
          })
          notify('quality_corrections', 90, `✅ Correções: ${corrections.mergesApplied} merge(s), ${corrections.cardsRemoved} remoção(ões)`, { cardEstimate: estimatedCards, cardCount: cards.length })
        } else {
          notify('quality_check', 90, '✅ Supervisor: qualidade OK', { cardEstimate: estimatedCards, cardCount: cards.length })
        }
        const aiSummary = `🤖 IA criou ${aiCardsCreated} cards de ${cards.length} totais`
        notify('generating_cards', 90, `${aiSummary} (${filesProcessed} arquivos)`, { cardEstimate: estimatedCards, cardCount: cards.length })
        return {
          cards, filesProcessed, aiUsed: true, aiCardsCreated,
          ...(filesSkipped > 0 && { filesSkipped, errorDetails }),
          ...(exclusionMetrics.totalSkipped > 0 && { exclusionMetrics })
        }
      } catch (featureErr: unknown) {
        const msg = featureErr instanceof Error ? featureErr.message : String(featureErr)
        console.error('[GithubService] Erro IA:', msg)
        throw new Error(`Falha na análise por IA: ${msg}`)
      }
    }
    throw new Error('Importação requer análise por IA')
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
