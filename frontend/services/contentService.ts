import { apiClient, ApiResponse } from './apiClient'
import type { Content, CreateContentData, UpdateContentData, ContentQueryParams, TutorialContentType } from '@/types/content'

class ContentService {
  private readonly endpoint = '/contents'

  // ================================================
  // READ
  // ================================================

  async getAll(params?: ContentQueryParams): Promise<ApiResponse<Content[]> | undefined> {
    // Converter contentType para 'type' (o que o backend espera)
    const queryParams: Record<string, any> = {}
    if (params) {
      if (params.page) queryParams.page = params.page
      if (params.limit) queryParams.limit = params.limit
      if (params.contentType) queryParams.type = params.contentType // Backend espera 'type'
      if (params.category) queryParams.category = params.category
      if (params.search) queryParams.search = params.search
      if (params.sortBy) queryParams.sortBy = params.sortBy
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder
    }
    return apiClient.get<Content[]>(this.endpoint, queryParams)
  }

  async getById(id: string): Promise<ApiResponse<Content> | undefined> {
    return apiClient.get<Content>(`${this.endpoint}/${id}`)
  }

  async getPostTags(): Promise<ApiResponse<{ label: string }[]> | undefined> {
    return apiClient.get<{ label: string }[]>(`${this.endpoint}/post-tags`)
  }

  // ================================================
  // CREATE (admin only)
  // ================================================

  async create(data: CreateContentData): Promise<ApiResponse<Content> | undefined> {
    return apiClient.post<Content>(this.endpoint, data)
  }

  // ================================================
  // UPDATE (admin only)
  // ================================================

  async update(id: string, data: UpdateContentData): Promise<ApiResponse<Content> | undefined> {
    return apiClient.put<Content>(`${this.endpoint}/${id}`, data)
  }

  async updateSelectedCardFeature(id: string, cardFeatureId: string | null): Promise<ApiResponse<Content> | undefined> {
    return apiClient.patch<Content>(`${this.endpoint}/${id}/card-feature`, { cardFeatureId })
  }

  // ================================================
  // DELETE (admin only)
  // ================================================

  async delete(id: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.delete<null>(`${this.endpoint}/${id}`)
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  /**
   * Busca apenas tutoriais (vídeos)
   */
  async getTutorials(params?: Omit<ContentQueryParams, 'contentType'>): Promise<ApiResponse<Content[]> | undefined> {
    return this.getAll({ ...params, contentType: 'video' as TutorialContentType })
  }

  /**
   * Busca tutoriais paginados
   */
  async getTutorialsPaginated(page: number = 1, limit: number = 10): Promise<ApiResponse<Content[]>> {
    return (await this.getTutorials({ page, limit })) ?? { success: false, error: 'Nenhuma resposta do servidor' }
  }
}

// Instância singleton
export const contentService = new ContentService()

// Export dos tipos para uso externo
export type {
  Content,
  CreateContentData,
  UpdateContentData,
  ContentQueryParams
}
