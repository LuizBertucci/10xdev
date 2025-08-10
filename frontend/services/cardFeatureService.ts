// ================================================
// CARD FEATURE SERVICE - API calls for CardFeatures
// ================================================

import { apiClient, ApiResponse } from './apiClient'

// ================================================
// INTERFACES (temporárias - serão movidas para types)
// ================================================

interface CardFeatureScreen {
  name: string
  description: string
  code: string
}

interface CardFeature {
  id: string
  title: string
  tech: string
  language: string
  description: string
  screens: CardFeatureScreen[]
  createdAt: string
  updatedAt: string
}

interface CreateCardFeatureData {
  title: string
  tech: string
  language: string
  description: string
  screens: CardFeatureScreen[]
}

interface UpdateCardFeatureData extends Partial<CreateCardFeatureData> {}

interface CardFeatureQueryParams {
  page?: number
  limit?: number
  tech?: string
  language?: string
  search?: string
  sortBy?: 'title' | 'tech' | 'language' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

interface CardFeatureListResponse {
  data: CardFeature[]
  count: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface CardFeatureStats {
  total: number
  byTech: Record<string, number>
  byLanguage: Record<string, number>
  recentCount: number
}

// ================================================
// CARD FEATURE SERVICE CLASS
// ================================================

class CardFeatureService {
  private readonly endpoint = '/card-features'

  // ================================================
  // CREATE
  // ================================================

  async create(data: CreateCardFeatureData): Promise<ApiResponse<CardFeature>> {
    return apiClient.post<CardFeature>(this.endpoint, data)
  }

  async bulkCreate(items: CreateCardFeatureData[]): Promise<ApiResponse<CardFeature[]>> {
    return apiClient.post<CardFeature[]>(`${this.endpoint}/bulk`, items)
  }

  // ================================================
  // READ
  // ================================================

  async getAll(params?: CardFeatureQueryParams): Promise<ApiResponse<CardFeatureListResponse>> {
    return apiClient.get<CardFeatureListResponse>(this.endpoint, params)
  }

  async getById(id: string): Promise<ApiResponse<CardFeature>> {
    return apiClient.get<CardFeature>(`${this.endpoint}/${id}`)
  }

  async search(searchTerm: string, params?: Omit<CardFeatureQueryParams, 'search'>): Promise<ApiResponse<CardFeatureListResponse>> {
    const searchParams = { ...params, q: searchTerm }
    return apiClient.get<CardFeatureListResponse>(`${this.endpoint}/search`, searchParams)
  }

  async getByTech(tech: string, params?: Omit<CardFeatureQueryParams, 'tech'>): Promise<ApiResponse<CardFeatureListResponse>> {
    return apiClient.get<CardFeatureListResponse>(`${this.endpoint}/tech/${tech}`, params)
  }

  async getStats(): Promise<ApiResponse<CardFeatureStats>> {
    return apiClient.get<CardFeatureStats>(`${this.endpoint}/stats`)
  }

  // ================================================
  // UPDATE
  // ================================================

  async update(id: string, data: UpdateCardFeatureData): Promise<ApiResponse<CardFeature>> {
    return apiClient.put<CardFeature>(`${this.endpoint}/${id}`, data)
  }

  // ================================================
  // DELETE
  // ================================================

  async delete(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`${this.endpoint}/${id}`)
  }

  async bulkDelete(ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    // Usar POST para bulk delete já que o método delete só aceita endpoint
    return apiClient.post<{ deletedCount: number }>(`${this.endpoint}/bulk-delete`, { ids })
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  /**
   * Busca CardFeatures com filtros inteligentes
   */
  async searchWithFilters(filters: {
    searchTerm?: string
    tech?: string
    language?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<CardFeatureListResponse>> {
    const { searchTerm, ...params } = filters

    if (searchTerm) {
      return this.search(searchTerm, params)
    } else if (params.tech && params.tech !== 'all') {
      return this.getByTech(params.tech, params)
    } else {
      return this.getAll(params)
    }
  }

  /**
   * Busca CardFeatures paginados
   */
  async getPaginated(page: number = 1, limit: number = 10): Promise<ApiResponse<CardFeatureListResponse>> {
    return this.getAll({ page, limit })
  }

  /**
   * Busca CardFeatures recentes
   */
  async getRecent(limit: number = 5): Promise<ApiResponse<CardFeatureListResponse>> {
    return this.getAll({ 
      limit, 
      sortBy: 'created_at', 
      sortOrder: 'desc' 
    })
  }

  /**
   * Busca CardFeatures por múltiplas tecnologias
   */
  async getByMultipleTechs(techs: string[]): Promise<CardFeature[]> {
    const promises = techs.map(tech => this.getByTech(tech))
    const results = await Promise.allSettled(promises)
    
    const allCardFeatures: CardFeature[] = []
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        const response = result.value as ApiResponse<CardFeatureListResponse>
        if (response.data?.data) {
          allCardFeatures.push(...response.data.data)
        }
      }
    })
    
    // Remover duplicatas baseado no ID
    const uniqueCardFeatures = allCardFeatures.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    )
    
    return uniqueCardFeatures
  }

  /**
   * Valida dados antes de criar/atualizar
   */
  validateCardFeatureData(data: CreateCardFeatureData | UpdateCardFeatureData): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    if ('title' in data) {
      if (!data.title || data.title.trim().length === 0) {
        errors.push('Título é obrigatório')
      } else if (data.title.length > 255) {
        errors.push('Título deve ter no máximo 255 caracteres')
      }
    }
    
    if ('tech' in data) {
      if (!data.tech || data.tech.trim().length === 0) {
        errors.push('Tecnologia é obrigatória')
      }
    }
    
    if ('language' in data) {
      if (!data.language || data.language.trim().length === 0) {
        errors.push('Linguagem é obrigatória')
      }
    }
    
    if ('description' in data) {
      if (!data.description || data.description.trim().length === 0) {
        errors.push('Descrição é obrigatória')
      } else if (data.description.length > 1000) {
        errors.push('Descrição deve ter no máximo 1000 caracteres')
      }
    }
    
    if ('screens' in data && data.screens) {
      if (!Array.isArray(data.screens) || data.screens.length === 0) {
        errors.push('Pelo menos uma tela/arquivo é obrigatório')
      } else {
        data.screens.forEach((screen, index) => {
          if (!screen.name?.trim()) {
            errors.push(`Tela ${index + 1}: Nome é obrigatório`)
          }
          if (!screen.description?.trim()) {
            errors.push(`Tela ${index + 1}: Descrição é obrigatória`)
          }
          if (!screen.code?.trim()) {
            errors.push(`Tela ${index + 1}: Código é obrigatório`)
          }
        })
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
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
}

// Instância singleton
export const cardFeatureService = new CardFeatureService()

// Export dos tipos para uso externo
export type {
  CardFeature,
  CardFeatureScreen,
  CreateCardFeatureData,
  UpdateCardFeatureData,
  CardFeatureQueryParams,
  CardFeatureListResponse,
  CardFeatureStats
}