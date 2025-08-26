// ================================================
// CARD FEATURE SERVICE - API calls for CardFeatures
// ================================================

import { apiClient, ApiResponse } from './apiClient'
import type { 
  CardFeatureScreen,
  CardFeature,
  CreateCardFeatureData,
  UpdateCardFeatureData,
  CardFeatureQueryParams,
  CardFeatureListResponse
} from '../types/cardfeature'

// ================================================
// INTERFACES ADICIONAIS PARA O FRONTEND
// ================================================


interface CardFeatureListResponseFrontend {
  success: boolean
  data: CardFeature[]
  count: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
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

  async getAll(params?: CardFeatureQueryParams): Promise<ApiResponse<CardFeatureListResponseFrontend>> {
    return apiClient.get<CardFeatureListResponseFrontend>(this.endpoint, params)
  }

  async getById(id: string): Promise<ApiResponse<CardFeature>> {
    return apiClient.get<CardFeature>(`${this.endpoint}/${id}`)
  }

  async search(searchTerm: string, params?: Omit<CardFeatureQueryParams, 'search'>): Promise<ApiResponse<CardFeatureListResponseFrontend>> {
    const searchParams = { ...params, q: searchTerm }
    return apiClient.get<CardFeatureListResponseFrontend>(`${this.endpoint}/search`, searchParams)
  }

  async getByTech(tech: string, params?: Omit<CardFeatureQueryParams, 'tech'>): Promise<ApiResponse<CardFeatureListResponseFrontend>> {
    return apiClient.get<CardFeatureListResponseFrontend>(`${this.endpoint}/tech/${tech}`, params)
  }

  async getStats(): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.endpoint}/stats`)
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
    return apiClient.post<{ deletedCount: number }>(`${this.endpoint}/bulk-delete`, { ids })
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  /**
   * Search CardFeatures with smart filters
   */
  async searchWithFilters(filters: {
    searchTerm?: string
    tech?: string
    language?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<CardFeatureListResponseFrontend>> {
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
   * Get paginated CardFeatures
   */
  async getPaginated(page: number = 1, limit: number = 10): Promise<ApiResponse<CardFeatureListResponseFrontend>> {
    return this.getAll({ page, limit })
  }

  /**
   * Get recent CardFeatures
   */
  async getRecent(limit: number = 5): Promise<ApiResponse<CardFeatureListResponseFrontend>> {
    return this.getAll({ 
      limit, 
      sortBy: 'created_at', 
      sortOrder: 'desc' 
    })
  }

  /**
   * Get CardFeatures by multiple technologies
   */
  async getByMultipleTechs(techs: string[]): Promise<CardFeature[]> {
    const promises = techs.map(tech => this.getByTech(tech))
    const results = await Promise.allSettled(promises)
    
    const allCardFeatures: CardFeature[] = []
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        const response = result.value as ApiResponse<CardFeatureListResponseFrontend>
        if (response.data?.data) {
          allCardFeatures.push(...response.data.data)
        }
      }
    })
    
    const uniqueCardFeatures = allCardFeatures.filter((item, index, self) => 
      index === self.findIndex(cardFeature => cardFeature.id === item.id)
    )
    
    return uniqueCardFeatures
  }


  /**
   * Format CardFeature for display
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

// Singleton instance
export const cardFeatureService = new CardFeatureService()

// Export types for external use
export type {
  CardFeature,
  CardFeatureScreen,
  CreateCardFeatureData,
  UpdateCardFeatureData,
  CardFeatureQueryParams,
  CardFeatureListResponseFrontend as CardFeatureListResponse
}