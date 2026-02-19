export interface Example {
  id: string
  title: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
  }
}
