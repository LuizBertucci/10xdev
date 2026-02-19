export interface TemplateRow {
  id: string
  name: string
  description?: string | null
  version?: string | null
  tags?: string[] | null
  zip_path: string
  zip_url?: string | null
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface TemplateInsert {
  id: string
  name: string
  description?: string
  version?: string
  tags?: string[]
  zip_path: string
  zip_url?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface TemplateUpdate {
  name?: string
  description?: string
  version?: string
  tags?: string[]
  zip_path?: string
  zip_url?: string
  is_active?: boolean
  updated_at?: string
}

export interface TemplateResponse {
  id: string
  name: string
  description?: string
  version?: string
  tags?: string[]
  zipPath: string
  zipUrl?: string
  isActive: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  version?: string
  tags?: string[]
  zipPath: string
  zipUrl?: string
  isActive?: boolean
  createdBy?: string
}

export interface UpdateTemplateRequest {
  name?: string
  description?: string
  version?: string
  tags?: string[]
  zipPath?: string
  zipUrl?: string
  isActive?: boolean
}

export interface TemplateQueryParams {
  page?: number | undefined
  limit?: number | undefined
  search?: string | undefined
  isActive?: boolean | undefined
  sortBy?: 'name' | 'created_at' | 'updated_at' | undefined
  sortOrder?: 'asc' | 'desc' | undefined
}

export interface ModelResult<T = TemplateResponse> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface ModelListResult<T = TemplateResponse> {
  success: boolean
  data?: T[]
  count?: number
  error?: string
  statusCode?: number
}
