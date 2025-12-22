import { ModelResult, ModelListResult } from './user'

// User roles
export type UserRole = 'admin' | 'user' | 'consultor'

// User status
export type UserStatus = 'active' | 'inactive'

// Extended User interface with admin fields
export interface UserRow {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: UserRole
  status: UserStatus
  team_id: string | null
  created_at: string
  updated_at: string
}

// User with statistics
export interface UserWithStats extends UserRow {
  cards_created: number
  projects_created: number
  projects_participating: number
}

// System-wide statistics
export interface SystemStats {
  total_users: number
  active_users: number
  inactive_users: number
  admin_users: number
  total_cards: number
  total_projects: number
  cards_this_week: number
  cards_this_month: number
  users_this_week: number
  users_this_month: number
}

// User detail with all information
export interface UserDetail extends UserWithStats {
  recent_cards?: Array<{
    id: string
    title: string
    tech: string
    created_at: string
  }>
  recent_projects?: Array<{
    id: string
    name: string
    role: string
    created_at: string
  }>
}

// Request/Response types for API
export interface UpdateUserRoleRequest {
  role: UserRole
}

export interface UpdateUserStatusRequest {
  status: UserStatus
}

export interface UserResponse {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: UserRole
  status: UserStatus
  teamId: string | null
  createdAt: string
  updatedAt: string
}

export interface UserWithStatsResponse extends UserResponse {
  cardsCreated: number
  projectsCreated: number
  projectsParticipating: number
}

export interface SystemStatsResponse {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  adminUsers: number
  totalCards: number
  totalProjects: number
  cardsThisWeek: number
  cardsThisMonth: number
  usersThisWeek: number
  usersThisMonth: number
}

// Historical data types
export type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all'

export interface HistoricalDataPoint {
  date: string
  count: number
}

export interface HistoricalDataParams {
  period: TimePeriod
  userId?: string // Para filtrar cards por usuário
}

export interface CardsHistoricalResponse {
  period: TimePeriod
  data: HistoricalDataPoint[]
  total: number
}

export interface UsersHistoricalResponse {
  period: TimePeriod
  data: HistoricalDataPoint[]
  total: number
}

// Model result types
export type AdminUserResult = ModelResult<UserWithStats>
export type AdminUsersResult = ModelListResult<UserWithStats>
export type AdminStatsResult = ModelResult<SystemStats>
export type AdminDeleteResult = ModelResult<{ id: string }>
export type CardsHistoricalResult = ModelResult<HistoricalDataPoint[]>
export type UsersHistoricalResult = ModelResult<HistoricalDataPoint[]>
