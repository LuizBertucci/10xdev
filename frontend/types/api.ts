// ================================================
// API TYPES - Frontend specific API types
// ================================================

// ================================================
// GENERIC API RESPONSE STRUCTURE
// ================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  count?: number
  totalPages?: number
  currentPage?: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
  searchTerm?: string
  tech?: string
}

export interface ApiError {
  success: false
  error: string
  statusCode?: number
  details?: any
}

export interface ApiListResponse<T> {
  success: boolean
  data: T[]
  count: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// ================================================
// LOADING & ERROR STATES
// ================================================

export interface LoadingState {
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  isFetching: boolean
  isSearching: boolean
}

export interface ErrorState {
  hasError: boolean
  errorMessage: string | null
  errorCode?: number
  lastError?: Date
}

export interface ApiState<T = any> extends LoadingState, ErrorState {
  data: T | null
  lastFetch?: Date
}

// ================================================
// QUERY PARAMETERS
// ================================================

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface SortParams {
  sortBy?: 'title' | 'tech' | 'language' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface FilterParams {
  tech?: string
  language?: string
  search?: string
}

export interface QueryParams extends PaginationParams, SortParams, FilterParams {}

// ================================================
// CARD FEATURE SPECIFIC API TYPES
// ================================================

export interface CardFeatureListResponse {
  data: import('./cardfeature').CardFeature[]
  count: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface CardFeatureStats {
  total: number
  byTech: Record<string, number>
  byLanguage: Record<string, number>
  recentCount: number
}

export interface BulkDeleteResponse {
  deletedCount: number
}

// ================================================
// REQUEST TYPES
// ================================================

export interface CreateCardFeatureRequest {
  title: string
  tech: string
  language: string
  description: string
  screens: import('./cardfeature').CardFeatureScreen[]
}

export interface UpdateCardFeatureRequest extends Partial<CreateCardFeatureRequest> {}

export interface BulkCreateRequest {
  items: CreateCardFeatureRequest[]
}

export interface BulkDeleteRequest {
  ids: string[]
}

// ================================================
// FRONTEND SPECIFIC TYPES
// ================================================

export interface SearchFilters {
  searchTerm: string
  tech: string
  language: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface UiState {
  selectedItemId: string | null
  editingItemId: string | null
  showCreateModal: boolean
  showEditModal: boolean
  showDeleteModal: boolean
  showBulkDeleteModal: boolean
  activeTab: string
  selectedItems: string[]
}

export interface FormState<T = any> {
  data: T
  errors: Record<string, string>
  isValid: boolean
  isDirty: boolean
  isSubmitting: boolean
}

// ================================================
// HOOKS RETURN TYPES
// ================================================

export interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  clearError: () => void
}

export interface UseListApiReturn<T> extends UseApiReturn<T[]> {
  count: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export interface UseMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  loading: boolean
  error: string | null
  data: TData | null
  reset: () => void
}

// ================================================
// VALIDATION TYPES
// ================================================

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// ================================================
// NOTIFICATION TYPES
// ================================================

export interface NotificationPayload {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  id?: string
}

// ================================================
// EXPORT UTILITIES
// ================================================

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type RequestConfig = {
  method: ApiMethod
  url: string
  data?: any
  params?: any
  headers?: Record<string, string>
}

export type CacheConfig = {
  enabled: boolean
  ttl?: number // Time to live in milliseconds
  key?: string
}