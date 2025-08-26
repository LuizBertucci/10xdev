// ================================================
// INTERFACES PRINCIPAIS - Importadas do Backend
// ================================================

// Import backend interfaces as single source of truth
export type {
  CardFeatureScreen,
  CardFeatureResponse as CardFeature,
  CreateCardFeatureRequest as CreateCardFeatureData,
  UpdateCardFeatureRequest as UpdateCardFeatureData,
  CardFeatureQueryParams,
  CardFeatureListResponse,
  SupportedTech,
  SupportedLanguage
} from '../../backend/src/types/cardfeature'

/**
 * CardFeature with additional fields for UI
 */
export interface CardFeatureDisplay extends CardFeature {
  formattedCreatedAt: string
  formattedUpdatedAt: string
  screenCount: number
  isSelected?: boolean
  isEditing?: boolean
}

/**
 * Minimal data to create new tab/screen
 * CRITICAL: description and code are optional per backend
 */
export interface CreateScreenData {
  name: string
  description?: string
  code?: string
}

// ================================================
// ESTADO DO SISTEMA CRUD
// ================================================

/**
 * Complete CardFeature system state
 * Updated to work with API
 */
export interface CardFeatureState {
  // Main data
  items: CardFeature[]
  filteredItems: CardFeature[]
  
  // Loading states
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  isFetching: boolean
  
  // Error states
  error: string | null
  lastError: Date | null

  // UI states
  selectedItem: CardFeature | null
  editingItem: CardFeature | null
  isCreating: boolean
  isEditing: boolean
  showDeleteConfirm: boolean
  deleteItemId: string | null

  // Interface controls
  activeTab: string
  searchTerm: string
  selectedTech: string
  
  // Pagination
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalCount: number
}

// ================================================
// TIPOS PARA COMPONENTES
// ================================================

/**
 * Props for CardFeature components
 */
export interface CardFeatureProps {
  cardFeature: CardFeature
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

/**
 * Props for view modal
 */
export interface CardFeatureModalProps {
  cardFeature: CardFeature | null
  isOpen: boolean
  onClose: () => void
  activeTab: string
  onTabChange: (tabName: string) => void
}

/**
 * Props for CardFeature forms
 */
export interface CardFeatureFormProps {
  cardFeature?: CardFeature
  onSubmit: (data: CreateCardFeatureData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

/**
 * Props for tabs/screens editor
 */
export interface CardFeatureTabEditorProps {
  screens: CardFeatureScreen[]
  onChange: (screens: CardFeatureScreen[]) => void
  activeScreenIndex: number
  onActiveScreenChange: (index: number) => void
}

// Backend enums are already exported above

/**
 * Possible states for CRUD operations
 */
export enum CrudStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// ================================================
// TIPOS UTILITÁRIOS
// ================================================

/**
 * Result of CRUD operations
 */
export interface CrudResult<T = CardFeature> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  searchTerm: string
  selectedTech: string
  sortBy: 'title' | 'tech' | 'language' | 'created_at' | 'updated_at'
  sortOrder: 'asc' | 'desc'
}

/**
 * Pagination configuration (for future)
 */
export interface PaginationConfig {
  page: number
  limit: number
  total: number
}

/**
 * CardFeature metadata (for statistics)
 */
export interface CardFeatureMetadata {
  totalCount: number
  techCounts: Record<string, number>
  languageCounts: Record<string, number>
  recentlyCreated: CardFeature[]
  recentlyUpdated: CardFeature[]
}

// ================================================
// TIPOS PARA HOOKS
// ================================================

/**
 * Return from useCardFeatures hook
 * Updated to work with API
 */
export interface UseCardFeaturesReturn {
  // State
  items: CardFeature[]
  filteredItems: CardFeature[]
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  isFetching: boolean
  error: string | null
  selectedItem: CardFeature | null
  editingItem: CardFeature | null
  isCreating: boolean
  isEditing: boolean
  showDeleteConfirm: boolean
  deleteItemId: string | null
  activeTab: string
  searchTerm: string
  selectedTech: string
  
  // Pagination
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalCount: number

  // CRUD Operations (return API promises)
  createCardFeature: (data: CreateCardFeatureData) => Promise<CardFeature | null>
  getCardFeature: (id: string) => Promise<CardFeature | null>
  updateCardFeature: (id: string, data: UpdateCardFeatureData) => Promise<CardFeature | null>
  deleteCardFeature: (id: string) => Promise<boolean>
  fetchCardFeatures: (params?: CardFeatureQueryParams) => Promise<void>
  searchCardFeatures: (searchTerm: string) => Promise<void>
  
  // Bulk Operations
  bulkCreate: (items: CreateCardFeatureData[]) => Promise<CardFeature[]>
  bulkDelete: (ids: string[]) => Promise<number>

  // UI Actions
  startCreating: () => void
  cancelCreating: () => void
  startEditing: (item: CardFeature) => void
  cancelEditing: () => void
  selectCardFeature: (id: string) => void
  setActiveTab: (tabName: string) => void
  showDeleteConfirmation: (id: string) => void
  cancelDelete: () => void
  setSearchTerm: (term: string) => void
  setSelectedTech: (tech: string) => void
  clearSelection: () => void
  clearError: () => void
  
  // Pagination
  goToPage: (page: number) => Promise<void>
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  refreshData: () => Promise<void>
  
}

/**
 * Options to configure useCardFeatures hook
 */
export interface UseCardFeaturesOptions {
  autoLoad?: boolean
  storageKey?: string
  enableRealTimeSync?: boolean
}

// ================================================
// TIPOS PARA VALIDAÇÃO (futuro)
// ================================================

/**
 * Validation schema for CardFeature
 */
export interface CardFeatureValidationSchema {
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
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
}

// ================================================
// TIPOS PARA IMPORT/EXPORT (futuro)
// ================================================

/**
 * Format for CardFeatures export
 */
export interface CardFeatureExport {
  version: string
  exportedAt: Date
  items: CardFeature[]
  metadata: CardFeatureMetadata
}

/**
 * Configuration for import
 */
export interface ImportConfig {
  overwriteExisting: boolean
  validateData: boolean
  generateNewIds: boolean
}