// ================================================
// DATABASE TYPES - Supabase/PostgreSQL
// ================================================

export interface CardFeatureScreen {
  name: string
  description: string
  code: string
}

export interface CardFeatureRow {
  id: string
  title: string
  tech: string
  language: string
  description: string
  screens: CardFeatureScreen[]
  created_at: string
  updated_at: string
}

export interface CardFeatureInsert {
  id?: string
  title: string
  tech: string
  language: string
  description: string
  screens: CardFeatureScreen[]
  created_at?: string
  updated_at?: string
}

export interface CardFeatureUpdate {
  id?: string
  title?: string
  tech?: string
  language?: string
  description?: string
  screens?: CardFeatureScreen[]
  updated_at?: string
}

// ================================================
// API REQUEST/RESPONSE TYPES
// ================================================

export interface CreateCardFeatureRequest {
  title: string
  tech: string
  language: string
  description: string
  screens: CardFeatureScreen[]
}

export interface UpdateCardFeatureRequest extends Partial<CreateCardFeatureRequest> {}

export interface CardFeatureResponse {
  id: string
  title: string
  tech: string
  language: string
  description: string
  screens: CardFeatureScreen[]
  createdAt: string
  updatedAt: string
}

export interface CardFeatureListResponse {
  data: CardFeatureResponse[]
  count: number
  totalPages?: number
  currentPage?: number
}

export interface SearchCardFeaturesResponse extends CardFeatureListResponse {
  searchTerm: string
  relevance?: Record<string, number>
}

// ================================================
// QUERY PARAMETERS
// ================================================

export interface CardFeatureQueryParams {
  page?: number
  limit?: number
  tech?: string
  language?: string
  search?: string
  sortBy?: 'title' | 'tech' | 'language' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface CardFeatureFilters {
  tech?: string
  language?: string
  searchTerm?: string
  dateRange?: {
    start: string
    end: string
  }
}

// ================================================
// MODEL OPERATION RESULTS
// ================================================

export interface ModelResult<T = CardFeatureResponse> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface ModelListResult<T = CardFeatureResponse> {
  success: boolean
  data?: T[]
  count?: number
  error?: string
  statusCode?: number
}

// ================================================
// VALIDATION SCHEMAS
// ================================================

export interface CardFeatureValidationRules {
  title: {
    required: boolean
    minLength: number
    maxLength: number
  }
  tech: {
    required: boolean
    allowedValues: string[]
  }
  language: {
    required: boolean
    allowedValues: string[]
  }
  description: {
    required: boolean
    minLength: number
    maxLength: number
  }
  screens: {
    required: boolean
    minItems: number
    maxItems: number
    itemRules: {
      name: { required: boolean; maxLength: number }
      description: { required: boolean; maxLength: number }
      code: { required: boolean; maxLength: number }
    }
  }
}

// ================================================
// ENUMS
// ================================================

export enum SupportedTech {
  REACT = 'React',
  NODEJS = 'Node.js',
  PYTHON = 'Python',
  JAVASCRIPT = 'JavaScript',
  VUE = 'Vue.js',
  ANGULAR = 'Angular',
  DJANGO = 'Django',
  FASTAPI = 'FastAPI',
  EXPRESS = 'Express'
}

export enum SupportedLanguage {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  HTML = 'html',
  CSS = 'css',
  JSON = 'json',
  YAML = 'yaml',
  SQL = 'sql'
}

export enum SortOrder {
  ASC = 'aesc',
  DESC = 'desc'
}

export enum SortBy {
  TITLE = 'title',
  TECH = 'tech',
  LANGUAGE = 'language',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at'
}