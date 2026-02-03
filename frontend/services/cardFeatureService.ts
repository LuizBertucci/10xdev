import { apiClient, ApiResponse } from './apiClient'
import type { CardFeature, CardFeatureScreen, CreateCardFeatureData, UpdateCardFeatureData, QueryParams, CardFeatureListResponse, CardFeatureStats, GenerateSummaryResponse } from '@/types'

class CardFeatureService {
  private readonly endpoint = '/card-features'

  async create(data: CreateCardFeatureData): Promise<ApiResponse<CardFeature> | undefined> {
    return apiClient.post<CardFeature>(this.endpoint, data)
  }

  async bulkCreate(items: CreateCardFeatureData[]): Promise<ApiResponse<CardFeature[]> | undefined> {
    return apiClient.post<CardFeature[]>(`${this.endpoint}/bulk`, items)
  }

  // ================================================
  // READ
  // ================================================

  async getAll(params?: QueryParams): Promise<ApiResponse<CardFeature[]> | undefined> {
    return apiClient.get<CardFeature[]>(this.endpoint, params)
  }

  async getById(id: string): Promise<ApiResponse<CardFeature> | undefined> {
    return apiClient.get<CardFeature>(`${this.endpoint}/${id}`)
  }

  async search(searchTerm: string, params?: Omit<QueryParams, 'search'>): Promise<ApiResponse<CardFeature[]> | undefined> {
    const searchParams = { ...params, q: searchTerm }
    return apiClient.get<CardFeature[]>(`${this.endpoint}/search`, searchParams)
  }

  async getByTech(tech: string, params?: Omit<QueryParams, 'tech'>): Promise<ApiResponse<CardFeature[]> | undefined> {
    return apiClient.get<CardFeature[]>(`${this.endpoint}/tech/${tech}`, params)
  }

  async getStats(): Promise<ApiResponse<CardFeatureStats> | undefined> {
    return apiClient.get<CardFeatureStats>(`${this.endpoint}/stats`)
  }

  // ================================================
  // UPDATE
  // ================================================

  async update(id: string, data: UpdateCardFeatureData): Promise<ApiResponse<CardFeature> | undefined> {
    return apiClient.put<CardFeature>(`${this.endpoint}/${id}`, data)
  }

  // ================================================
  // MODERATION (admin)
  // ================================================

  async approve(id: string): Promise<ApiResponse<CardFeature> | undefined> {
    return apiClient.post<CardFeature>(`${this.endpoint}/${id}/approve`)
  }

  async reject(id: string): Promise<ApiResponse<CardFeature> | undefined> {
    return apiClient.post<CardFeature>(`${this.endpoint}/${id}/reject`)
  }

  // ================================================
  // DELETE
  // ================================================

  async delete(id: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.delete<null>(`${this.endpoint}/${id}`)
  }

  async bulkDelete(ids: string[]): Promise<ApiResponse<{ deletedCount: number }> | undefined> {
    return apiClient.delete<{ deletedCount: number }>(`${this.endpoint}/bulk`, { ids })
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  /** Busca CardFeatures com filtros inteligentes */
  async searchWithFilters(filters: {
    searchTerm?: string
    tech?: string
    language?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<CardFeature[]>> {
    const { searchTerm, ...params } = filters

    if (searchTerm) {
      return (await this.search(searchTerm, params)) ?? { success: false, error: 'Nenhuma resposta do servidor' }
    } else if (params.tech && params.tech !== 'all') {
      return (await this.getByTech(params.tech, params)) ?? { success: false, error: 'Nenhuma resposta do servidor' }
    } else {
      return (await this.getAll(params)) ?? { success: false, error: 'Nenhuma resposta do servidor' }
    }
  }

  /**
   * Busca CardFeatures paginados
   */
  async getPaginated(page: number = 1, limit: number = 10): Promise<ApiResponse<CardFeature[]>> {
    return (await this.getAll({ page, limit })) ?? { success: false, error: 'Nenhuma resposta do servidor' }
  }

  /**
   * Busca CardFeatures recentes
   */
  async getRecent(limit: number = 5): Promise<ApiResponse<CardFeature[]>> {
    return (await this.getAll({ 
      limit, 
      sortBy: 'created_at', 
      sortOrder: 'desc' 
    })) ?? { success: false, error: 'Nenhuma resposta do servidor' }
  }

  // ================================================
  // SHARING (compartilhamento de cards privados)
  // ================================================

  /**
   * Compartilha um card privado com usuários específicos
   */
  async shareCard(cardId: string, userIds: string[]): Promise<ApiResponse<any> | undefined> {
    return apiClient.post<any>(`${this.endpoint}/${cardId}/share`, { userIds })
  }

  /**
   * Remove o compartilhamento de um card com um usuário
   */
  async unshareCard(cardId: string, userId: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.delete<null>(`${this.endpoint}/${cardId}/share/${userId}`)
  }

  /**
   * Lista todos os usuários com quem o card está compartilhado
   */
  async getCardShares(cardId: string): Promise<ApiResponse<any[]> | undefined> {
    return apiClient.get<any[]>(`${this.endpoint}/${cardId}/shares`)
  }

  /**
   * Busca CardFeatures por múltiplas tecnologias
   */
  async getByMultipleTechs(techs: string[]): Promise<CardFeature[]> {
    const promises = techs.map(tech => this.getByTech(tech))
    const results = await Promise.allSettled(promises)
    
    const allCardFeatures: CardFeature[] = []
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const response = result.value
        if (response?.success && response.data && Array.isArray(response.data)) {
          allCardFeatures.push(...response.data)
        }
      }
    })
    
    // Remover duplicatas baseado no ID
    const uniqueCardFeatures = allCardFeatures.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    )
    
    return uniqueCardFeatures
  }

  async generateSummary(cardId: string, force?: boolean): Promise<GenerateSummaryResponse> {
    const response = await apiClient.post<GenerateSummaryResponse>(`${this.endpoint}/${cardId}/generate-summary`, { force })
    
    if (response?.success) {
      return {
        success: true,
        summary: (response as any).summary || response.data?.summary || '',
        message: (response as any).message || response.data?.message
      }
    }
    
    throw new Error(response?.error || 'Erro ao gerar resumo')
  }

  async checkAccess(cardId: string): Promise<{ success: boolean; data?: { canGenerate: boolean; isOwner: boolean; isAdmin: boolean }; error?: string }> {
    const response = await apiClient.get(`${this.endpoint}/${cardId}/access`)
    if (!response) {
      return { success: false, error: 'Erro ao verificar acesso' }
    }
    return response as { success: boolean; data?: { canGenerate: boolean; isOwner: boolean; isAdmin: boolean }; error?: string }
  }

  /**
   * Formata CardFeature para exibição
   */
  formatForDisplay(cardFeature: CardFeature): CardFeature & {
    formattedCreatedAt: string
    formattedUpdatedAt: string
    screenCount: number
  } {
    return {
      ...cardFeature,
      formattedCreatedAt: new Date(cardFeature.createdAt).toLocaleDateString('pt-BR'),
      formattedUpdatedAt: new Date(cardFeature.updatedAt).toLocaleDateString('pt-BR'),
      screenCount: cardFeature.screens.length
    }
  }

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}

// Instância singleton
export const cardFeatureService = new CardFeatureService()

// Export dos tipos para uso externo
export type {
  CardFeature,
  CardFeatureScreen,
  CreateCardFeatureData,
  UpdateCardFeatureData,
  QueryParams,
  CardFeatureListResponse,
  CardFeatureStats
}