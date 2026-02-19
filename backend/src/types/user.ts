export interface UserRow {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface UserResponse {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

export interface UserSearchParams {
  query: string
  limit?: number
}

export interface ModelResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface ModelListResult<T> {
  success: boolean
  data?: T[]
  count?: number
  error?: string
  statusCode?: number
}

