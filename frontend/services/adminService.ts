import { apiClient, ApiResponse } from './apiClient'

export type AdminUserRow = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: 'admin' | 'user' | null
  status: 'active' | 'inactive' | null
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

  async setUserRole(userId: string, role: 'admin' | 'user'): Promise<ApiResponse<{ id: string; role: 'admin' | 'user' }> | undefined> {
    return apiClient.patch<{ id: string; role: 'admin' | 'user' }>(`${this.endpoint}/users/${userId}/role`, { role })
  }

  async deleteUser(userId: string): Promise<ApiResponse<{ id: string; anonymizedCards: number; deletedProjects: number }> | undefined> {
    return apiClient.delete<{ id: string; anonymizedCards: number; deletedProjects: number }>(`${this.endpoint}/users/${userId}`)
  }
}

export const adminService = new AdminService()




