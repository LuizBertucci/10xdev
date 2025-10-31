// ================================================
// SERVICES INDEX - Centralized service exports
// ================================================

// API Client
export { apiClient } from './apiClient'
export type { ApiResponse, ApiError, ApiClient } from './apiClient'

// CardFeature Service
export { cardFeatureService } from './cardFeatureService'
export type {
  CardFeature,
  CardFeatureScreen,
  CreateCardFeatureData,
  UpdateCardFeatureData,
  CardFeatureQueryParams,
  CardFeatureListResponse,
  CardFeatureStats
} from './cardFeatureService'

// Educational Service
export { educationalService } from './educationalService'
export type { EducationalVideo, CreateEducationalVideoData } from './educationalService'