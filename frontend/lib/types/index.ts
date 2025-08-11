// ================================================
// TIPOS CENTRALIZADOS - 10xDev Platform
// ================================================

// ================================================
// CARD FEATURES TYPES
// ================================================

export interface CardFeature {
  id: string
  title: string
  tech: Technology
  language: ProgrammingLanguage
  description: string
  screens: CodeScreen[]
  createdAt: string
  updatedAt: string
}

export interface CodeScreen {
  name: string
  description: string
  code: string
}

// ================================================
// TECHNOLOGY & LANGUAGE ENUMS
// ================================================

export type Technology = 
  | 'React'
  | 'Node.js'
  | 'Python' 
  | 'Vue.js'
  | 'Angular'
  | 'Express'
  | 'MongoDB'
  | 'TypeScript'
  | 'JavaScript'

export type ProgrammingLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown'

// ================================================
// CRUD OPERATION TYPES
// ================================================

export interface CreateCardFeatureData {
  title: string
  tech: Technology
  language: ProgrammingLanguage
  description: string
  screens: CodeScreen[]
}

export interface UpdateCardFeatureData extends Partial<CreateCardFeatureData> {}

// ================================================
// API RESPONSE TYPES
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
}

export interface ApiError {
  success: false
  error: string
  statusCode?: number
  details?: any
}

// ================================================
// QUERY & FILTER TYPES
// ================================================

export interface QueryParams {
  page?: number
  limit?: number
  search?: string
  tech?: string
  language?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface CardFeatureFilters {
  searchTerm: string
  selectedTech: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ================================================
// AUTHENTICATION TYPES
// ================================================

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string | null
  email_verified: boolean
  created_at: string
  updated_at: string
  last_login: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// ================================================
// UI STATE TYPES
// ================================================

export interface CardFeatureState {
  items: CardFeature[]
  loading: boolean
  error: string | null
  selectedItem: CardFeature | null
  editingItem: CardFeature | null
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// ================================================
// HOOK OPTIONS TYPES
// ================================================

export interface UseCardFeaturesOptions {
  initialFilters?: CardFeatureFilters
  autoFetch?: boolean
}

// ================================================
// PLATFORM STATE TYPES
// ================================================

export type PlatformTab = 'home' | 'codes' | 'lessons' | 'projects' | 'ai' | 'dashboard'

export interface PlatformState {
  activeTab: PlatformTab
  setActiveTab: (tab: PlatformTab) => void
}

// ================================================
// LESSON TYPES (para futuro uso)
// ================================================

export interface VideoLesson {
  id: string
  title: string
  description: string
  video_url: string
  thumbnail_url?: string
  duration?: number
  order_index: number
  created_at: string
  updated_at: string
}

export interface LessonSeries {
  id: string
  title: string
  description: string
  thumbnail_url?: string
  lessons: VideoLesson[]
  total_duration?: number
  lesson_count: number
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado'
  created_at: string
  updated_at: string
}

// ================================================
// UTILITY TYPES
// ================================================

export type WithLoading<T> = T & {
  loading: boolean
  error: string | null
}

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

// ================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// ================================================

// Re-export everything for easy imports
export * from './index'