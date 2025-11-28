import axios from 'axios'
import type { GithubRepoInfo } from '@/types/project'

export class GithubService {
  private static parseGithubUrl(url: string): { owner: string; repo: string } | null {
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

  static async getRepoDetails(url: string, token?: string): Promise<GithubRepoInfo> {
    const repoInfo = this.parseGithubUrl(url)
    if (!repoInfo) {
      throw new Error('URL do GitHub inválida')
    }

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json'
      }

      if (token) {
        headers['Authorization'] = `token ${token}`
      }

      const response = await axios.get(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`,
        { headers }
      )

      // Construir URL limpa sem credenciais ou parâmetros
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
      throw error
    }
  }
}
