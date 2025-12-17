import { apiClient, ApiResponse } from './apiClient'
import type { CardFeatureReview, ReviewStats, CreateReviewRequest } from '@/types'

class CardFeatureReviewService {
  private readonly endpoint = '/card-features'

  /**
   * Criar ou atualizar review de um card
   */
  async createOrUpdate(cardId: string, data: CreateReviewRequest): Promise<ApiResponse<CardFeatureReview> | undefined> {
    return apiClient.post<CardFeatureReview>(`${this.endpoint}/${cardId}/reviews`, data)
  }

  /**
   * Remover review do usuário atual
   */
  async delete(cardId: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.delete<null>(`${this.endpoint}/${cardId}/reviews`)
  }

  /**
   * Listar todos os reviews de um card
   */
  async getByCardFeature(cardId: string): Promise<ApiResponse<CardFeatureReview[]> | undefined> {
    return apiClient.get<CardFeatureReview[]>(`${this.endpoint}/${cardId}/reviews`)
  }

  /**
   * Obter estatísticas de reviews de um card
   */
  async getStats(cardId: string): Promise<ApiResponse<ReviewStats> | undefined> {
    return apiClient.get<ReviewStats>(`${this.endpoint}/${cardId}/reviews/stats`)
  }
}

// Instância singleton
export const cardFeatureReviewService = new CardFeatureReviewService()

// Export dos tipos para uso externo
export type {
  CardFeatureReview,
  ReviewStats,
  CreateReviewRequest
}
