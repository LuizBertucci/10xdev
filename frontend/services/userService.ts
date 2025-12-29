import { apiClient, ApiResponse } from './apiClient'
import type { CardFeature } from '@/types'

// ================================================
// TYPES
// ================================================

export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

interface UserSearchParams {
  q: string
  limit?: number
}

interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

interface MyCardsResponse {
  data: CardFeature[]
  count: number
  currentPage: number
  totalPages: number
}

// ================================================
// SERVICE
// ================================================

class UserService {
  private readonly endpoint = '/users'

  // ================================================
  // SEARCH
  // ================================================

  async searchUsers(query: string, limit: number = 10): Promise<ApiResponse<User[]> | undefined> {
    return apiClient.get<User[]>(`${this.endpoint}/search`, { q: query, limit })
  }

  // ================================================
  // CHANGE PASSWORD
  // ================================================

  async changePassword(data: ChangePasswordData): Promise<ApiResponse<{ message: string }> | undefined> {
    return apiClient.post<{ message: string }>(`${this.endpoint}/change-password`, data)
  }

  // ================================================
  // MY CARDS
  // ================================================

  async getMyCards(page: number = 1, limit: number = 10): Promise<ApiResponse<CardFeature[]> | undefined> {
    return apiClient.get<CardFeature[]>(`${this.endpoint}/my-cards`, { page, limit })
  }
}

// Singleton instance
export const userService = new UserService()

