import { apiClient, ApiResponse } from './apiClient'

export type AdminUserRow = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: string | null
  status: string | null
  createdAt: string | null
  updatedAt: string | null
  cardCount: number
}

class AdminService {
  private readonly endpoint = '/admin'

  async listUsers(): Promise<ApiResponse<AdminUserRow[]> | undefined> {
    return apiClient.get<AdminUserRow[]>(`${this.endpoint}/users`)
  }

  async setUserStatus(userId: string, status: 'active' | 'inactive'): Promise<ApiResponse<{ id: string; status: 'active' | 'inactive' }> | undefined> {
    return apiClient.patch<{ id: string; status: 'active' | 'inactive' }>(`${this.endpoint}/users/${userId}/status`, { status })
  }
}

export const adminService = new AdminService()



