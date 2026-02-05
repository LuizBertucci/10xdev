// ============================================
// GITHUB OAUTH SERVICE
// ============================================
// Gerencia a autenticação OAuth com o GitHub:
// - Gera URL de autorização
// - Troca código por token de acesso
// - Cria cliente Octokit autenticado
// - Executa operações na API do GitHub (listar repos, criar branches, etc.)

import { Octokit } from '@octokit/rest'
import { GitHubOAuthTokenModel } from '@/models/gitsync'
import type { ModelResult, GitHubOAuthTokenResponse, GitHubRepo, GitHubBranch, GitHubCommit, GitHubFileContent } from '@/types/gitsync'

export class GitHubOAuthService {
  /**
   * Client ID do GitHub App
   * Configurado em GITHUB_CLIENT_ID
   */
  private readonly clientId: string

  /**
   * Client Secret do GitHub App
   * Configurado em GITHUB_CLIENT_SECRET
   */
  private readonly clientSecret: string

  /**
   * URL de callback após autorização
   * Configurado em GITHUB_REDIRECT_URI
   */
  private readonly redirectUri: string

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || ''
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || ''
    this.redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/api/gitsync/oauth/callback'
  }

  /**
   * Gera a URL de autorização OAuth do GitHub
   * O usuário será redirecionado para esta URL para autorizar o app
   * O parâmetro state contém o projectId codificado para recuperar após o callback
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'repo,user:email',
      state: state
    })
    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  /**
   * Troca o código de autorização por um token de acesso
   * Called pelo callback OAuth
   */
  async exchangeCodeForToken(code: string): Promise<ModelResult<{ accessToken: string; scope: string }>> {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code
        })
      })

      const data = await response.json() as any

      if (data.error) {
        return {
          success: false,
          error: data.error_description || data.error,
          statusCode: 400
        }
      }

      return {
        success: true,
        data: {
          accessToken: data.access_token,
          scope: data.scope
        },
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao trocar código por token',
        statusCode: 500
      }
    }
  }

  /**
   * Busca o token de acesso do usuário no banco
   */
  async getUserAccessToken(userId: string): Promise<ModelResult<string | null>> {
    const tokenResult = await GitHubOAuthTokenModel.findByUserId(userId)
    
    if (!tokenResult.success) {
      return {
        success: false,
        error: tokenResult.error || 'Erro ao buscar token',
        statusCode: tokenResult.statusCode
      }
    }

    if (!tokenResult.data) {
      return { success: true, data: null, statusCode: 200 }
    }

    return {
      success: true,
      data: tokenResult.data.accessToken,
      statusCode: 200
    }
  }

  /**
   * Salva o token de acesso do usuário no banco
   */
  async saveToken(userId: string, accessToken: string, scope?: string): Promise<ModelResult<GitHubOAuthTokenResponse>> {
    return GitHubOAuthTokenModel.upsert(userId, accessToken, scope)
  }

  /**
   * Remove o token de acesso do usuário (desconectar GitHub)
   */
  async deleteToken(userId: string): Promise<ModelResult<null>> {
    return GitHubOAuthTokenModel.deleteByUserId(userId)
  }

  /**
   * Cria um cliente Octokit autenticado com o token do usuário
   * Este cliente pode ser usado para fazer chamadas à API do GitHub em nome do usuário
   */
  async createOctokitClient(userId: string): Promise<ModelResult<Octokit | null>> {
    const tokenResult = await this.getUserAccessToken(userId)
    
    if (!tokenResult.success || !tokenResult.data) {
      return {
        success: false,
        error: 'Token não encontrado. Por favor, conecte sua conta GitHub.',
        statusCode: 401
      }
    }

    const octokit = new Octokit({
      auth: tokenResult.data
    })

    return {
      success: true,
      data: octokit,
      statusCode: 200
    }
  }

  /**
   * Lista os repositórios do usuário autenticado
   * Usa o token OAuth do usuário para acessar seus repos
   */
  async getUserRepos(userId: string): Promise<ModelResult<GitHubRepo[]>> {
    const octokitResult = await this.createOctokitClient(userId)
    
    if (!octokitResult.success || !octokitResult.data) {
      return {
        success: false,
        error: octokitResult.error || 'Erro ao criar cliente GitHub',
        statusCode: octokitResult.statusCode
      }
    }

    const octokit = octokitResult.data

    try {
      const { data: repos } = await octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100
      })

      const formattedRepos: GitHubRepo[] = repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: {
          login: repo.owner.login
        },
        default_branch: repo.default_branch || 'main',
        private: repo.private,
        html_url: repo.html_url,
        clone_url: repo.clone_url
      }))

      return {
        success: true,
        data: formattedRepos,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar repositórios',
        statusCode: 500
      }
    }
  }

  /**
   * Busca informações de um repositório específico
   */
  async getRepo(userId: string, owner: string, repo: string): Promise<ModelResult<GitHubRepo>> {
    const octokitResult = await this.createOctokitClient(userId)
    
    if (!octokitResult.success || !octokitResult.data) {
      return {
        success: false,
        error: octokitResult.error || 'Erro ao criar cliente GitHub',
        statusCode: octokitResult.statusCode
      }
    }

    const octokit = octokitResult.data

    try {
      const { data } = await octokit.repos.get({
        owner,
        repo
      })

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          full_name: data.full_name,
          owner: {
            login: data.owner.login
          },
          default_branch: data.default_branch || 'main',
          private: data.private,
          html_url: data.html_url,
          clone_url: data.clone_url
        },
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar repositório',
        statusCode: 500
      }
    }
  }

  /**
   * Lista as branches de um repositório
   */
  async getBranches(userId: string, owner: string, repo: string): Promise<ModelResult<GitHubBranch[]>> {
    const octokitResult = await this.createOctokitClient(userId)
    
    if (!octokitResult.success || !octokitResult.data) {
      return {
        success: false,
        error: octokitResult.error || 'Erro ao criar cliente GitHub',
        statusCode: octokitResult.statusCode
      }
    }

    const octokit = octokitResult.data

    try {
      const { data } = await octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100
      })

      return {
        success: true,
        data: data.map(branch => ({
          name: branch.name,
          commit: {
            sha: branch.commit.sha,
            url: branch.commit.url
          }
        })),
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar branches',
        statusCode: 500
      }
    }
  }

  /**
   * Busca o conteúdo de um arquivo no repositório
   * Usado para obter o SHA atual antes de fazer update
   */
  async getFileContent(
    userId: string,
    owner: string,
    repo: string,
    path: string,
    branch?: string
  ): Promise<ModelResult<GitHubFileContent | null>> {
    const octokitResult = await this.createOctokitClient(userId)
    
    if (!octokitResult.success || !octokitResult.data) {
      return {
        success: false,
        error: octokitResult.error || 'Erro ao criar cliente GitHub',
        statusCode: octokitResult.statusCode
      }
    }

    const octokit = octokitResult.data

    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch || 'main'
      })

      if (Array.isArray(data)) {
        return {
          success: false,
          error: 'O path especificado é um diretório, não um arquivo',
          statusCode: 400
        }
      }

      const contentData = data as any

      return {
        success: true,
        data: {
          name: contentData.name,
          path: contentData.path,
          sha: contentData.sha,
          size: contentData.size,
          type: contentData.type as 'file' | 'dir',
          content: contentData.content,
          encoding: contentData.encoding,
          download_url: contentData.download_url
        },
        statusCode: 200
      }
    } catch (error: any) {
      if (error.status === 404) {
        return { success: true, data: null, statusCode: 200 }
      }
      return {
        success: false,
        error: error.message || 'Erro ao buscar conteúdo do arquivo',
        statusCode: 500
      }
    }
  }

  /**
   * Cria ou atualiza um arquivo no repositório
   * Se o arquivo existe, requer o SHA atual para evitar conflitos
   */
  async createOrUpdateFile(
    userId: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ): Promise<ModelResult<{ sha: string; commitSha: string }>> {
    const octokitResult = await this.createOctokitClient(userId)
    
    if (!octokitResult.success || !octokitResult.data) {
      return {
        success: false,
        error: octokitResult.error || 'Erro ao criar cliente GitHub',
        statusCode: octokitResult.statusCode
      }
    }

    const octokit = octokitResult.data

    try {
      const encodedContent = Buffer.from(content).toString('base64')

      const createParams: any = {
        owner,
        repo,
        path,
        message: message,
        content: encodedContent,
        branch: branch
      }

      if (sha) {
        createParams.sha = sha
      }

      const { data } = await octokit.repos.createOrUpdateFileContents(createParams)

      const responseData = data as any

      return {
        success: true,
        data: {
          sha: responseData.content.sha,
          commitSha: responseData.commit.sha
        },
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao criar/atualizar arquivo',
        statusCode: 500
      }
    }
  }

  /**
   * Cria uma nova branch a partir de uma branch existente
   */
  async createBranch(
    userId: string,
    owner: string,
    repo: string,
    branchName: string,
    baseBranchParam: string = 'main'
  ): Promise<ModelResult<{ sha: string }>> {
    const octokitResult = await this.createOctokitClient(userId)
    
    if (!octokitResult.success || !octokitResult.data) {
      return {
        success: false,
        error: octokitResult.error || 'Erro ao criar cliente GitHub',
        statusCode: octokitResult.statusCode
      }
    }

    const octokit = octokitResult.data

    try {
      const { data: baseBranchData } = await octokit.repos.getBranch({
        owner,
        repo,
        branch: baseBranchParam
      })

      const { data: newBranch } = await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseBranchData.commit.sha
      })

      return {
        success: true,
        data: { sha: newBranch.ref },
        statusCode: 201
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao criar branch',
        statusCode: 500
      }
    }
  }

  /**
   * Cria um Pull Request
   */
  async createPullRequest(
    userId: string,
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ): Promise<ModelResult<{ number: number; url: string }>> {
    const octokitResult = await this.createOctokitClient(userId)
    
    if (!octokitResult.success || !octokitResult.data) {
      return {
        success: false,
        error: octokitResult.error || 'Erro ao criar cliente GitHub',
        statusCode: octokitResult.statusCode
      }
    }

    const octokit = octokitResult.data

    try {
      const { data: pr } = await octokit.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base
      })

      return {
        success: true,
        data: {
          number: pr.number,
          url: pr.html_url
        },
        statusCode: 201
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao criar Pull Request',
        statusCode: 500
      }
    }
  }
}

// Exporta uma instância única do serviço
export const gitHubOAuthService = new GitHubOAuthService()
