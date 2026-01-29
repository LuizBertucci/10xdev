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
  ProjectQueryParams,
  GithubRepoInfo
} from './projectService'

// Template Service
export { templateService } from './templateService'
export type { ProjectTemplate, CreateTemplateData, UpdateTemplateData, TemplateQueryParams } from './templateService'

// User Service
export { userService } from './userService'
export type { User } from './userService'

// Admin Service
export { adminService } from './adminService'
export type { AdminUserRow } from './adminService'

// Content Service (Tutorials)
export { contentService } from './contentService'
export type {
  Content,
  CreateContentData,
  UpdateContentData,
  ContentQueryParams
} from './contentService'
