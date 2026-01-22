// Example entity types
export interface Example {
  id: string
  title: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateExampleRequest {
  title: string
  description?: string
}

export interface UpdateExampleRequest {
  title?: string
  description?: string
}

export interface ExampleQueryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: 'created_at' | 'title'
  sortOrder?: 'asc' | 'desc'
}
