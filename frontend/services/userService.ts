import { apiClient, ApiResponse } from './apiClient'

// ================================================
// TYPES
// ================================================

export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

interface _UserSearchParams {
  q: string
  limit?: number
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
}

// Singleton instance
export const userService = new UserService()

