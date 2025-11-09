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
  QueryParams,
  CardFeatureListResponse,
  CardFeatureStats
} from './cardFeatureService'

// Video Service
export { videoService } from './videoService'
export type { Video, CreateVideoData } from './videoService'

// Project Service
export { projectService, ProjectMemberRole } from './projectService'
export type {
  Project,
  ProjectMember,
  ProjectCard,
  CreateProjectData,
  UpdateProjectData,
  AddProjectMemberData,
  UpdateProjectMemberData,
  ProjectQueryParams
} from './projectService'