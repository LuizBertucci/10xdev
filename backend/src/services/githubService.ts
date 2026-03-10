import axios from 'axios'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { AiCardGroupingService } from '@/services/aiCardGroupingService'
import { normalizeGithubFilePath } from '@/utils/githubPath'
import { GithubModel } from '@/models/GithubModel'
import { ProjectModel } from '@/models/ProjectModel'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import { Visibility } from '@/types/cardfeature'
import type { GithubRepoInfo } from '@/types/project'
import type { CreateCardFeatureRequest } from '@/types/cardfeature'
import type {
  GithubWebhookPushPayload,
  GithubWebhookInstallationPayload,
  GithubSyncFileMappingInsert,
  GithubSyncFileMappingRow
} from '@/types/project'
import { classifyFile, type FileExclusionReason } from '@/utils/fileFilters'

interface ParsedRepoInfo {
  owner: string
  repo: string
}

export interface FileEntry {
  path: string
  content: string
  size: number
}

const CONCURRENCY = 8

export class GithubService {

  static parseGithubUrl(url: string): ParsedRepoInfo | null {
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
    if (token) {
      const prefix = token.startsWith('github_pat_') ? 'Bearer' : 'token'
      headers.Authorization = `${prefix} ${token}`
    }
    return headers
  }

  private static getFileExtension(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    if (fileName.toLowerCase() === 'dockerfile') return '.dockerfile'
    if (fileName.startsWith('.env')) return '.env'
    const lastDot = fileName.lastIndexOf('.')
    if (lastDot === -1) return ''
    return fileName.substring(lastDot).toLowerCase()
  }

  // ================================================
  // REPO OPERATIONS
  // ================================================

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
        isPrivate: Boolean(data.private),
        defaultBranch: data.default_branch || 'main'
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

  /** Lista arquivos do repositório via GitHub API (Tree API).
   *  Retorna todos os arquivos da branch padrão recursivamente. */
  /** Lista arquivos do repositório via GitHub API (Tree API).
   *  Retorna todos os arquivos da branch padrão recursivamente. */
  static async listRepoFiles(
    owner: string,
    repo: string,
    branch: string,
    token?: string,
    opts?: { onSkipped?: (path: string, reason: FileExclusionReason) => void }
  ): Promise<FileEntry[]> {
    const headers = this.getHeaders(token)

    const refResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      { headers, timeout: 15000 }
    )
    const commitSha = refResponse.data.object.sha

    const treeResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`,
      { headers, timeout: 60000 }
    )

    const files: FileEntry[] = []
    const tree: Array<{ type?: string; path?: string; size?: number }> = treeResponse.data.tree || []

    if (treeResponse.data.truncated) {
      console.warn(`[GithubService] Tree truncated for ${owner}/${repo}; some files may be missing`)
    }

    const filteredItems: Array<{ type?: string; path?: string; size?: number }> = []
    for (const item of tree) {
      if (item.type !== 'blob' || !item.path) continue
      const classification = classifyFile(item.path)
      if (classification.included) {
        filteredItems.push(item)
      } else {
        opts?.onSkipped?.(item.path, classification.reason)
      }
    }

    for (let i = 0; i < filteredItems.length; i += CONCURRENCY) {
      const chunk = filteredItems.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        chunk.map((item) =>
          axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${commitSha}`,
            { headers, timeout: 30000 }
          ).then((r) => ({
            path: item.path!,
            content: Buffer.from(r.data.content, 'base64').toString('utf8'),
            size: item.size || 0
          }))
        )
      )
      for (const r of results) {
        if (r.status === 'fulfilled') files.push(r.value)
      }
    }

    return files
  }

  /** Obtém conteúdo de um arquivo do repo */
  static async getFileContent(
    token: string, owner: string, repo: string, filePath: string, ref?: string
  ): Promise<{ content: string; sha: string }> {
    const params: Record<string, string> = {}
    if (ref) params.ref = ref

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { headers: this.getHeaders(token), params, timeout: 15000 }
    )

    const content = Buffer.from(response.data.content, 'base64').toString('utf8')
    return { content, sha: response.data.sha }
  }

  /** Obtém SHA do último commit de uma branch */
  static async getLatestCommitSha(
    token: string, owner: string, repo: string, branch: string
  ): Promise<string> {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      { headers: this.getHeaders(token), timeout: 15000 }
    )
    return response.data.object.sha
  }

  /** Lista arquivos alterados entre dois commits */
  static async getCommitDiff(
    token: string, owner: string, repo: string, baseSha: string, headSha: string
  ): Promise<Array<{ filename: string; status: string; additions: number; deletions: number }>> {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`,
      { headers: this.getHeaders(token), timeout: 15000 }
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
      { headers: this.getHeaders(token), timeout: 15000 }
    )
  }

  /** Atualiza (ou cria) conteúdo de um arquivo no repo */
  static async updateFileContent(
    token: string, owner: string, repo: string,
    filePath: string, content: string, message: string, fileSha: string, branch: string
  ): Promise<{ sha: string }> {
    const encoded = Buffer.from(content, 'utf8').toString('base64')

    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { message, content: encoded, sha: fileSha, branch },
      { headers: this.getHeaders(token), timeout: 15000 }
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
      { headers: this.getHeaders(token), timeout: 15000 }
    )

    return {
      number: response.data.number,
      url: response.data.url,
      html_url: response.data.html_url
    }
  }

  // ================================================
  // GITHUB APP - Authentication & API
  // ================================================

  /** Gera JWT assinado com a private key do GitHub App.
    *  Válido por 10 minutos. Usado para obter installation tokens. */
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
      iat: now - 60,
      exp: now + (10 * 60),
      iss: appId
    }

    return jwt.sign(payload, privateKey, { algorithm: 'RS256' })
  }

  /** Obtém um installation access token para um installation_id.
   *  Válido por 1 hora. Permite operações no repo. */
  static async getInstallationToken(installationId: number): Promise<string> {
    const jwtToken = this.generateAppJWT()

    const response = await axios.post(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        timeout: 15000
      }
    )

    return response.data.token
  }

  /** Lista repositórios que o App tem acesso via installation_id */
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

  /** Busca installations do usuário autenticado via user access token */
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

  // ================================================
  // GITSYNC ORCHESTRATION
  // ================================================

  private static extractUniqueFilePaths(card: { screens?: Array<{ route?: string; blocks?: Array<{ route?: string }> }> }): string[] {
    const unique = new Set<string>()
    for (const screen of card.screens || []) {
      if (screen.route) unique.add(normalizeGithubFilePath(screen.route))
      for (const block of screen.blocks || []) {
        if (block.route) unique.add(normalizeGithubFilePath(block.route))
      }
    }
    return [...unique]
  }

  private static pickCanonicalCardId(mappings: GithubSyncFileMappingRow[]): string | null {
    if (mappings.length === 0) return null
    const countByCard = new Map<string, number>()
    mappings.forEach((mapping) => {
      countByCard.set(mapping.card_feature_id, (countByCard.get(mapping.card_feature_id) || 0) + 1)
    })
    let bestId: string | null = null
    let bestCount = -1
    for (const [cardId, count] of countByCard.entries()) {
      if (count > bestCount) {
        bestId = cardId
        bestCount = count
      }
    }
    return bestId
  }

  private static async preloadExistingProjectCardSignatures(
    projectId: string,
    signatureMap: Map<string, string>
  ): Promise<void> {
    const projectCards = await ProjectModel.getCardsAll(projectId)
    if (!projectCards.success || !projectCards.data?.length) return

    for (const projectCard of projectCards.data) {
      const card = projectCard.cardFeature
      if (!card?.id) continue
      const cardScreens = (card as { screens?: unknown }).screens
      const screens = Array.isArray(cardScreens)
        ? (cardScreens as Array<{ blocks?: Array<{ route?: string }> }>)
        : []
      const filePaths = this.extractUniqueFilePaths({ screens })
      if (filePaths.length === 0) continue
      const signature = [...filePaths].sort().join('|')
      if (!signature) continue
      if (!signatureMap.has(signature)) {
        signatureMap.set(signature, card.id)
      }
    }
  }

  private static async cleanupDuplicateCardsBySignature(
    projectId: string,
    userId: string
  ): Promise<{ removedCards: number; mergedGroups: number }> {
    const mappingsResult = await GithubModel.getMappingsByProject(projectId)
    if (!mappingsResult.success || !mappingsResult.data || mappingsResult.data.length === 0) {
      return { removedCards: 0, mergedGroups: 0 }
    }

    const pathsByCard = new Map<string, Set<string>>()
    for (const mapping of mappingsResult.data) {
      if (!pathsByCard.has(mapping.card_feature_id)) {
        pathsByCard.set(mapping.card_feature_id, new Set<string>())
      }
      pathsByCard.get(mapping.card_feature_id)!.add(mapping.file_path)
    }

    const cardsBySignature = new Map<string, string[]>()
    for (const [cardId, paths] of pathsByCard.entries()) {
      const signature = [...paths].sort().join('|')
      if (!signature) continue
      if (!cardsBySignature.has(signature)) cardsBySignature.set(signature, [])
      cardsBySignature.get(signature)!.push(cardId)
    }

    const cardsToDelete: string[] = []
    let mergedGroups = 0

    for (const cardIds of cardsBySignature.values()) {
      if (cardIds.length <= 1) continue
      mergedGroups++
      const [, ...duplicates] = cardIds
      cardsToDelete.push(...duplicates)
    }

    if (cardsToDelete.length === 0) {
      return { removedCards: 0, mergedGroups: 0 }
    }

    for (const duplicateCardId of cardsToDelete) {
      const githubResult = await GithubModel.deleteByCard(duplicateCardId)
      if (!githubResult.success) throw new Error(`Falha ao deletar github mapping do card ${duplicateCardId}: ${githubResult.error}`)
      const projectResult = await ProjectModel.removeCard(projectId, duplicateCardId, userId)
      if (!projectResult.success) throw new Error(`Falha ao remover card ${duplicateCardId} do projeto: ${projectResult.error}`)
    }

    const deleteResult = await CardFeatureModel.bulkDelete(cardsToDelete)
    if (!deleteResult.success) throw new Error(`Falha ao deletar card_features duplicados: ${deleteResult.error}`)
    return { removedCards: cardsToDelete.length, mergedGroups }
  }

  /** Lista branches do repositório via GitHub API */
  static async listBranches(
    token: string,
    owner: string,
    repo: string
  ): Promise<string[]> {
    const branches: string[] = []
    let page = 1
    const perPage = 100
    let hasMore = true

    while (hasMore) {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/branches`,
        {
          headers: this.getHeaders(token),
          params: { per_page: perPage, page },
          timeout: 15000
        }
      )
      const items: Array<{ name?: string }> = response.data || []
      items.forEach(b => { if (b.name) branches.push(b.name) })
      hasMore = items.length === perPage
      page++
    }

    return branches
  }

  /** Lista commits de uma branch com paginação */
  static async listCommits(
    token: string,
    owner: string,
    repo: string,
    branch: string,
    perPage = 30,
    page = 1
  ): Promise<import('@/types/project').CommitSummary[]> {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      {
        headers: this.getHeaders(token),
        params: { sha: branch, per_page: perPage, page },
        timeout: 15000
      }
    )

    return (response.data as unknown[]).map((c: unknown) => {
      const commit = c as {
        sha: string
        commit: {
          message: string
          author: { name: string; date: string }
        }
        author: { login: string; avatar_url: string } | null
      }
      const lines = commit.commit.message.split('\n')
      return {
        sha: commit.sha,
        shortSha: commit.sha.slice(0, 7),
        message: lines[0] ?? '',
        description: lines.slice(1).join('\n').trim() || null,
        authorName: commit.author?.login ?? commit.commit.author.name,
        authorAvatar: commit.author?.avatar_url ?? null,
        date: commit.commit.author.date
      }
    })
  }

  /** Retorna detalhes de um commit com o patch de cada arquivo */
  static async getCommitDetail(
    token: string,
    owner: string,
    repo: string,
    sha: string
  ): Promise<import('@/types/project').CommitDetail> {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`,
      { headers: this.getHeaders(token), timeout: 15000 }
    )

    const data = response.data as {
      sha: string
      commit: {
        message: string
        author: { name: string; date: string }
      }
      author: { login: string; avatar_url: string } | null
      files: Array<{
        filename: string
        status: string
        additions: number
        deletions: number
        patch?: string
      }>
    }

    const detailLines = data.commit.message.split('\n')
    return {
      sha: data.sha,
      shortSha: data.sha.slice(0, 7),
      message: detailLines[0] ?? '',
      description: detailLines.slice(1).join('\n').trim() || null,
      authorName: data.author?.login ?? data.commit.author.name,
      authorAvatar: data.author?.avatar_url ?? null,
      date: data.commit.author.date,
      files: (data.files ?? []).map(f => ({
        filename: f.filename,
        status: (['added', 'modified', 'removed', 'renamed'] as const).includes(f.status as 'added' | 'modified' | 'removed' | 'renamed')
          ? (f.status as 'added' | 'modified' | 'removed' | 'renamed')
          : 'modified',
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch ?? null,
        card: null
      }))
    }
  }

  /** Conecta um projeto a um repo GitHub, faz import inicial,
   *  e popula github_file_mappings com mapeamento arquivo->card. */
  static async connectRepo(
    projectId: string,
    installationId: number,
    owner: string,
    repo: string,
    userId: string,
    options?: {
      defaultBranch?: string
      onProgress?: (step: string, progress: number, message: string) => Promise<void>
    }
  ): Promise<{ success: boolean; mappingsCreated: number; error?: string }> {
    try {
      const branch = options?.defaultBranch || 'main'
      const cardBySignature = new Map<string, string>()

      const token = await this.getInstallationToken(installationId)

      let latestSha: string | null = null
      try {
        latestSha = await this.getLatestCommitSha(token, owner, repo, branch)
      } catch {
        console.warn('[GitSync] Nao foi possivel obter SHA do ultimo commit')
      }

      // Persiste apenas metadados da conexão; sync_active só após import concluir
      await ProjectModel.updateSyncInfo(projectId, {
        github_installation_id: installationId,
        github_owner: owner,
        github_repo: repo,
        default_branch: branch,
        github_sync_active: false
      })

      const repoUrl = `https://github.com/${owner}/${repo}`
      const files = await this.listRepoFiles(owner, repo, branch, token)

      // Evita duplicar cards em projetos que já tinham cards importados sem mappings.
      await this.preloadExistingProjectCardSignatures(projectId, cardBySignature)

      await AiCardGroupingService.generateCardGroupsFromRepo(
        files,
        repoUrl,
        {
          onProgress: async (p) => {
            if (options?.onProgress) {
              await options.onProgress(p.step, p.progress ?? 0, p.message ?? '')
            }
          },
          onCardReady: async (card) => {
            const filePaths = this.extractUniqueFilePaths(card)
            if (filePaths.length === 0) return
            const signature = [...filePaths].sort().join('|')

            let cardId = cardBySignature.get(signature) || null

            if (!cardId) {
              const existingMappings: GithubSyncFileMappingRow[] = []
              for (const filePath of filePaths) {
                const mapping = await GithubModel.getMappingByFilePath(projectId, filePath, branch)
                if (mapping.success && mapping.data) {
                  existingMappings.push(mapping.data)
                }
              }

              cardId = this.pickCanonicalCardId(existingMappings)
            }

            let createdNewCard = false
            if (!cardId) {
              const normalizedCard = {
                ...card,
                visibility: Visibility.UNLISTED,
                created_in_project_id: projectId
              }
              const createdRes = await CardFeatureModel.bulkCreate([normalizedCard] as CreateCardFeatureRequest[], userId)
              if (!createdRes.success || !createdRes.data?.length) {
                throw new Error(createdRes.error || 'Erro ao criar card no GitSync')
              }
              cardId = createdRes.data[0]!.id
              createdNewCard = true
              await ProjectModel.addCardsBulk(projectId, [cardId], userId)
            }

            if (!cardId) return
            cardBySignature.set(signature, cardId)

            const mappings: GithubSyncFileMappingInsert[] = []
            for (const filePath of filePaths) {
              mappings.push({
                project_id: projectId,
                card_feature_id: cardId,
                file_path: filePath,
                branch_name: branch,
                last_commit_sha: latestSha,
                last_synced_at: new Date().toISOString()
              })
            }

            if (mappings.length > 0) {
              await GithubModel.upsertMappingsBulk(mappings)
            }

            if (!createdNewCard && options?.onProgress) {
              await options.onProgress('quality_corrections', 92, `Reuso de card existente (${card.title})`)
            }
          }
        }
      )

      const dedupe = await this.cleanupDuplicateCardsBySignature(projectId, userId)
      if (dedupe.removedCards > 0 && options?.onProgress) {
        await options.onProgress(
          'quality_corrections',
          94,
          `Duplicatas removidas: ${dedupe.removedCards} card(s) em ${dedupe.mergedGroups} grupo(s)`
        )
      }

      const allMappings = await GithubModel.getMappingsByProject(projectId)

      // Import concluído com sucesso — agora ativa o sync
      await ProjectModel.updateSyncInfo(projectId, {
        github_sync_active: true,
        last_sync_at: new Date().toISOString(),
        last_sync_sha: latestSha
      })

      return {
        success: true,
        mappingsCreated: allMappings.count || 0
      }
    } catch (error: unknown) {
      console.error('[GitSync] Erro ao conectar repo:', error)
      // Garante que sync_active não fica true se o import falhou
      await ProjectModel.updateSyncInfo(projectId, { github_sync_active: false }).catch(() => {})
      const err = error as { message?: string }
      return { success: false, mappingsCreated: 0, error: err.message || 'Erro desconhecido' }
    }
  }

  /** Importa cards de uma branch alternativa.
   *  Se já há cards para a branch, deleta e reimporta (sobrescrita limpa). */
  static async importBranch(
    projectId: string,
    installationId: number,
    owner: string,
    repo: string,
    branch: string,
    userId: string
  ): Promise<{ success: boolean; cardsCreated: number; error?: string }> {
    try {
      const token = await this.getInstallationToken(installationId)

      let latestSha: string | null = null
      try {
        latestSha = await this.getLatestCommitSha(token, owner, repo, branch)
      } catch {
        console.warn('[GitSync importBranch] Não foi possível obter SHA da branch')
      }

      await ProjectModel.removeCardsByBranch(projectId, branch, userId)

      const repoUrl = `https://github.com/${owner}/${repo}`
      const files = await this.listRepoFiles(owner, repo, branch, token)

      let cardsCreated = 0
      const cardBySignature = new Map<string, string>()

      await AiCardGroupingService.generateCardGroupsFromRepo(
        files,
        repoUrl,
        {
          onCardReady: async (card) => {
            const filePaths = this.extractUniqueFilePaths(card)
            if (filePaths.length === 0) return
            const signature = [...filePaths].sort().join('|')

            if (cardBySignature.has(signature)) return
            cardBySignature.set(signature, '')

            const normalizedCard = {
              ...card,
              visibility: Visibility.UNLISTED,
              created_in_project_id: projectId
            }
            const createdRes = await CardFeatureModel.bulkCreate(
              [normalizedCard] as CreateCardFeatureRequest[],
              userId
            )
            if (!createdRes.success || !createdRes.data?.length) return
            const cardId = createdRes.data[0]!.id
            cardBySignature.set(signature, cardId)

            await ProjectModel.addCardsBulk(projectId, [cardId], userId, branch)

            const mappings: GithubSyncFileMappingInsert[] = filePaths.map(fp => ({
              project_id: projectId,
              card_feature_id: cardId,
              file_path: fp,
              branch_name: branch,
              last_commit_sha: latestSha,
              last_synced_at: new Date().toISOString()
            }))
            if (mappings.length > 0) {
              await GithubModel.upsertMappingsBulk(mappings)
            }

            cardsCreated++
          }
        }
      )

      return { success: true, cardsCreated }
    } catch (error: unknown) {
      console.error('[GitSync importBranch] Erro:', error)
      const err = error as { message?: string }
      return { success: false, cardsCreated: 0, error: err.message || 'Erro desconhecido' }
    }
  }

  /** Sincroniza mudancas do GitHub para os cards.
   *  Compara SHA atual com ultimo sync e atualiza blocos afetados. */
  static async syncFromGithub(projectId: string): Promise<{
    success: boolean
    filesUpdated: number
    filesAdded: number
    filesRemoved: number
    error?: string
  }> {
    try {
      const syncInfo = await ProjectModel.getSyncInfo(projectId)
      if (!syncInfo.success || !syncInfo.data) {
        return { success: false, filesUpdated: 0, filesAdded: 0, filesRemoved: 0, error: 'Projeto não encontrado' }
      }

      const project = syncInfo.data
      if (!project.github_sync_active || !project.github_installation_id || !project.github_owner || !project.github_repo) {
        return { success: false, filesUpdated: 0, filesAdded: 0, filesRemoved: 0, error: 'GitSync não está ativo' }
      }

      const { github_installation_id, github_owner, github_repo, default_branch, last_sync_sha } = project
      const token = await this.getInstallationToken(github_installation_id)

      const branch = default_branch || 'main'
      const currentSha = await this.getLatestCommitSha(token, github_owner, github_repo, branch)

      if (currentSha === last_sync_sha) {
        return { success: true, filesUpdated: 0, filesAdded: 0, filesRemoved: 0 }
      }

      let filesUpdated = 0
      let filesAdded = 0
      let filesRemoved = 0

      if (last_sync_sha) {
        try {
          const diff = await this.getCommitDiff(
            token, github_owner, github_repo, last_sync_sha, currentSha
          )

          for (const file of diff) {
            const mappingResult = await GithubModel.getMappingByFilePath(projectId, file.filename, branch)

            if (file.status === 'modified' && mappingResult.success && mappingResult.data) {
              try {
                const { content } = await this.getFileContent(
                  token, github_owner, github_repo, file.filename, currentSha
                )

                await this.updateCardBlock(mappingResult.data.card_feature_id, file.filename, content)

                await GithubModel.updateMapping(mappingResult.data.id, {
                  last_commit_sha: currentSha,
                  last_synced_at: new Date().toISOString()
                })

                filesUpdated++
              } catch (err: unknown) {
                console.warn(`[GitSync] Erro ao atualizar arquivo ${file.filename}:`, err)
              }
            } else if (file.status === 'removed' && mappingResult.success && mappingResult.data) {
              filesRemoved++
            } else if (file.status === 'added') {
              filesAdded++
            }
          }
        } catch (err: unknown) {
          console.warn('[GitSync] Erro ao obter diff, fazendo sync parcial:', err)
        }
      }

      await ProjectModel.updateSyncInfo(projectId, {
        last_sync_sha: currentSha,
        last_sync_at: new Date().toISOString()
      })

      return { success: true, filesUpdated, filesAdded, filesRemoved }
    } catch (error: unknown) {
      console.error('[GitSync] Erro no syncFromGithub:', error)
      const err = error as { message?: string }
      return { success: false, filesUpdated: 0, filesAdded: 0, filesRemoved: 0, error: err.message || 'Erro desconhecido' }
    }
  }

  /** Cria uma branch + PR com as mudancas do card.
   *  Chamado quando o usuario salva um card que tem file mappings. */
  static async syncToGithub(
    projectId: string,
    cardFeatureId: string
  ): Promise<{
    success: boolean
    prUrl?: string
    prNumber?: number
    error?: string
  }> {
    try {
      const syncInfo = await ProjectModel.getSyncInfo(projectId)
      if (!syncInfo.success || !syncInfo.data?.github_sync_active) {
        return { success: false, error: 'GitSync não está ativo' }
      }

      const { github_installation_id, github_owner, github_repo, default_branch } = syncInfo.data
      if (!github_installation_id || !github_owner || !github_repo) {
        return { success: false, error: 'Dados de conexão GitHub incompletos' }
      }

      const token = await this.getInstallationToken(github_installation_id)
      const mappingsResult = await GithubModel.getMappingsByCard(cardFeatureId)
      if (!mappingsResult.success || !mappingsResult.data?.length) {
        return { success: false, error: 'Nenhum mapeamento de arquivo encontrado para este card' }
      }

      const cardResult = await CardFeatureModel.findById(cardFeatureId)
      if (!cardResult.success || !cardResult.data) {
        return { success: false, error: 'Card não encontrado' }
      }

      const card = cardResult.data
      const branch = default_branch || 'main'

      const baseSha = await this.getLatestCommitSha(token, github_owner, github_repo, branch)
      const branchName = `10xdev/card-${cardFeatureId.substring(0, 8)}-${Date.now()}`
      await this.createBranch(token, github_owner, github_repo, branchName, baseSha)

      let filesChanged = 0
      for (const mapping of mappingsResult.data) {
        const blockContent = this.getCardBlockContent(card, mapping.file_path)
        if (!blockContent) continue

        try {
          const { sha: fileSha } = await this.getFileContent(
            token, github_owner, github_repo, mapping.file_path, branch
          )

          await this.updateFileContent(
            token, github_owner, github_repo,
            mapping.file_path, blockContent,
            `[10xDev] Atualizar ${mapping.file_path} via card ${card.title || cardFeatureId.substring(0, 8)}`,
            fileSha, branchName
          )

          filesChanged++
        } catch (err: unknown) {
          console.warn(`[GitSync] Erro ao atualizar ${mapping.file_path} no GitHub:`, err)
        }
      }

      if (filesChanged === 0) {
        return { success: false, error: 'Nenhum arquivo foi alterado' }
      }

      const pr = await this.createPullRequest(
        token, github_owner, github_repo,
        {
          title: `[10xDev] ${card.title || 'Atualização de card'}`,
          head: branchName,
          base: branch,
          body: [
            `## Mudanças via 10xDev`,
            '',
            `**Card:** ${card.title || cardFeatureId}`,
            `**Arquivos alterados:** ${filesChanged}`,
            '',
            `> Essa PR foi criada automaticamente pela plataforma 10xDev.`,
            `> As alterações refletem edições feitas nos cards do projeto.`
          ].join('\n')
        }
      )

      for (const mapping of mappingsResult.data) {
        await GithubModel.updateMapping(mapping.id, {
          last_pr_number: pr.number,
          last_pr_url: pr.html_url,
          last_pr_state: 'open',
          card_modified_at: null,
          last_synced_at: new Date().toISOString()
        })
      }

      return { success: true, prUrl: pr.html_url, prNumber: pr.number }
    } catch (error: unknown) {
      console.error('[GitSync] Erro no syncToGithub:', error)
      const err = error as { message?: string }
      return { success: false, error: err.message || 'Erro desconhecido' }
    }
  }

  /** Processa webhook push do GitHub.
   *  Identifica o projeto e dispara sync automatico. */
  static async handleWebhookPush(payload: GithubWebhookPushPayload): Promise<void> {
    const repoFullName = payload.repository?.full_name
    if (!repoFullName) {
      console.warn('[GitSync Webhook] Push sem repository.full_name')
      return
    }

    const parts = repoFullName.split('/')
    const owner = parts[0] || ''
    const repo = parts[1] || ''
    if (!owner || !repo) {
      console.warn('[GitSync Webhook] Push com full_name invalido:', repoFullName)
      return
    }
    const projectResult = await ProjectModel.findByGithubRepo(owner, repo)
    if (!projectResult.success || !projectResult.data) {
      console.log(`[GitSync Webhook] Nenhum projeto conectado ao repo ${repoFullName}`)
      return
    }

    const project = projectResult.data
    const branch = project.default_branch || 'main'
    const pushRef = payload.ref
    if (pushRef !== `refs/heads/${branch}`) {
      console.log(`[GitSync Webhook] Push na branch ${pushRef}, ignorando (monitorando ${branch})`)
      return
    }

    console.log(`[GitSync Webhook] Push detectado em ${repoFullName}/${branch}, sincronizando projeto ${project.id}`)
    try {
      const result = await this.syncFromGithub(project.id)
      console.log(`[GitSync Webhook] Sync concluido: ${result.filesUpdated} atualizados, ${result.filesAdded} adicionados, ${result.filesRemoved} removidos`)
    } catch (err: unknown) {
      console.error(`[GitSync Webhook] Erro no sync:`, err)
    }
  }

  /** Processa webhook de installation do GitHub App */
  static async handleWebhookInstallation(payload: GithubWebhookInstallationPayload): Promise<void> {
    const { action, installation } = payload
    console.log(`[GitSync Webhook] Installation ${action}: ${installation.id} (${installation.account.login})`)

    if (action === 'deleted' || action === 'suspend') {
      console.warn(`[GitSync Webhook] Installation ${action}: desativacao automatica nao implementada`)
    }
  }

  /** Detecta conflitos potenciais em um projeto.
   *  Conflito = card foi editado apos ultimo sync E GitHub tambem mudou. */
  static async detectConflicts(projectId: string): Promise<{
    hasConflicts: boolean
    conflicts: Array<{ filePath: string; cardId: string; mappingId: string }>
  }> {
    const result = await GithubModel.getConflicts(projectId)
    if (!result.success || !result.data?.length) {
      return { hasConflicts: false, conflicts: [] }
    }

    return {
      hasConflicts: true,
      conflicts: result.data.map(m => ({
        filePath: m.file_path,
        cardId: m.card_feature_id,
        mappingId: m.id
      }))
    }
  }

  /** Resolve um conflito, escolhendo manter o card ou o GitHub */
  static async resolveConflict(
    projectId: string,
    fileMappingId: string,
    resolution: 'keep_card' | 'keep_github'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const syncInfo = await ProjectModel.getSyncInfo(projectId)
      if (!syncInfo.success || !syncInfo.data?.github_sync_active) {
        return { success: false, error: 'GitSync não está ativo' }
      }

      if (resolution === 'keep_github') {
        const { github_installation_id, github_owner, github_repo } = syncInfo.data
        if (!github_installation_id || !github_owner || !github_repo) {
          return { success: false, error: 'Dados de conexão incompletos' }
        }

        const mappings = await GithubModel.getMappingsByProject(projectId)
        const mapping = mappings.data?.find(m => m.id === fileMappingId)
        if (!mapping) {
          return { success: false, error: 'Mapeamento não encontrado' }
        }

        const token = await this.getInstallationToken(github_installation_id)
        const { content } = await this.getFileContent(
          token, github_owner, github_repo, mapping.file_path, mapping.branch_name
        )

        await this.updateCardBlock(mapping.card_feature_id, mapping.file_path, content)
      }

      await GithubModel.updateMapping(fileMappingId, {
        card_modified_at: null,
        last_synced_at: new Date().toISOString()
      })

      return { success: true }
    } catch (error: unknown) {
      console.error('[GitSync] Erro ao resolver conflito:', error)
      const err = error as { message?: string }
      return { success: false, error: err.message || 'Erro desconhecido' }
    }
  }

  /** Atualiza o conteudo de um bloco em um card pelo file_path */
  private static async updateCardBlock(
    cardFeatureId: string,
    filePath: string,
    newContent: string
  ): Promise<void> {
    const cardResult = await CardFeatureModel.findById(cardFeatureId)
    if (!cardResult.success || !cardResult.data) return

    const card = cardResult.data
    let updated = false

    const normalizedTarget = normalizeGithubFilePath(filePath)
    const updatedScreens = (card.screens || []).map(screen => ({
      ...screen,
      blocks: (screen.blocks || []).map(block => {
        if (block.route && normalizeGithubFilePath(block.route) === normalizedTarget) {
          updated = true
          return { ...block, content: newContent }
        }
        return block
      })
    }))

    if (updated) {
      await CardFeatureModel.update(cardFeatureId, { screens: updatedScreens }, 'system', 'admin')
    }
  }

  /** Extrai conteudo de um bloco do card pelo file_path */
  private static getCardBlockContent(card: { screens?: Array<{ blocks?: Array<{ route?: string; content?: string }> }> }, filePath: string): string | null {
    const normalizedTarget = normalizeGithubFilePath(filePath)
    for (const screen of card.screens || []) {
      for (const block of screen.blocks || []) {
        if (block.route && normalizeGithubFilePath(block.route) === normalizedTarget && block.content) {
          return block.content
        }
      }
    }
    return null
  }
}
