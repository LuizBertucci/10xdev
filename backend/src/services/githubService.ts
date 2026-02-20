import axios from 'axios'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { GithubRepoInfo } from '@/types/project'
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
}
