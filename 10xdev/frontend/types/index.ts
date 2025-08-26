// ================================================
// TYPES INDEX - Centralized type exports
// ================================================

// ================================================
// CARDFEATURE TYPES - Core domain types
// ================================================
export type {
  CardFeature,
  CardFeatureScreen,
  CardFeatureDisplay,
  CreateCardFeatureData,
  UpdateCardFeatureData,
  CreateScreenData,
  CardFeatureState,
  CardFeatureProps,
  CardFeatureModalProps,
  CardFeatureFormProps,
  CardFeatureTabEditorProps,
  UseCardFeaturesReturn,
  UseCardFeaturesOptions,
  CardFeatureValidationSchema,
  CardFeatureExport,
  ImportConfig,
  CardFeatureMetadata,
  FilterConfig,
  PaginationConfig
} from './cardfeature'

// ================================================
// API TYPES - HTTP & state management types
// ================================================
export type {
  ApiResponse,
  ApiError,
  ApiListResponse,
  LoadingState,
  ErrorState,
  ApiState,
  PaginationParams,
  SortParams,
  FilterParams,
  QueryParams,
  CardFeatureListResponse,
  CardFeatureStats,
  BulkDeleteResponse,
  CreateCardFeatureRequest,
  UpdateCardFeatureRequest,
  BulkCreateRequest,
  BulkDeleteRequest,
  SearchFilters,
  UiState,
  FormState,
  UseApiReturn,
  UseListApiReturn,
  UseMutationReturn,
  ValidationRule,
  ValidationSchema,
  NotificationPayload,
  ApiMethod,
  RequestConfig,
  CacheConfig
} from './api'

// ================================================
// SHARED TYPES - Avoid duplication between modules
// ================================================
// ValidationResult is defined in both files - export from cardfeature as canonical
export type { ValidationResult } from './cardfeature'

// ================================================
// ENUMS & CONSTANTS - Value exports
// ================================================
// Backend enums - type-only imports to prevent runtime dependencies
export { type SupportedTech, type SupportedLanguage } from './cardfeature'
// Frontend enums - runtime exports
export { CrudStatus } from './cardfeature'