// ================================================
// ADMIN TYPES - Frontend admin panel types
// ================================================

// User roles
export type UserRole = 'admin' | 'user' | 'consultor'

// User status
export type UserStatus = 'active' | 'inactive'

// ================================================
// USER TYPES
// ================================================

export interface User {
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

export interface UserWithStats extends User {
  cardsCreated: number
  projectsCreated: number
  projectsParticipating: number
}

export interface UserDetail extends UserWithStats {
  recentCards?: RecentCard[]
  recentProjects?: RecentProject[]
}

export interface RecentCard {
  id: string
  title: string
  tech: string
  createdAt: string
}

export interface RecentProject {
  id: string
  name: string
  role: string
  createdAt: string
}

// ================================================
// SYSTEM STATISTICS
// ================================================

export interface SystemStats {
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

// ================================================
// API REQUEST/RESPONSE TYPES
// ================================================

export interface UpdateUserRoleRequest {
  role: UserRole
}

export interface UpdateUserStatusRequest {
  status: UserStatus
}

export interface AdminUsersResponse {
  success: boolean
  data: UserWithStats[]
  count: number
}

export interface AdminUserResponse {
  success: boolean
  data: UserWithStats | UserDetail
}

export interface AdminStatsResponse {
  success: boolean
  data: SystemStats
}

export interface AdminDeleteUserResponse {
  success: boolean
  data: { id: string }
  message: string
}

// ================================================
// ADMIN PANEL UI STATE
// ================================================

export interface AdminFilters {
  role: UserRole | 'all'
  status: UserStatus | 'all'
  search: string
}

export interface AdminUiState {
  selectedUserId: string | null
  showUserDetailModal: boolean
  showDeleteUserModal: boolean
  showEditRoleModal: boolean
  editingUserId: string | null
  deletingUserId: string | null
}

// ================================================
// ADMIN HOOK RETURN TYPES
// ================================================

export interface UseAdminReturn {
  // Data
  users: UserWithStats[]
  stats: SystemStats | null
  selectedUser: UserDetail | null

  // Loading states
  loading: boolean
  loadingStats: boolean
  loadingUser: boolean
  updating: boolean
  deleting: boolean

  // Error states
  error: string | null

  // Actions
  fetchUsers: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchUserById: (userId: string) => Promise<void>
  updateUserRole: (userId: string, role: UserRole) => Promise<void>
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  clearError: () => void
  refreshAll: () => Promise<void>
}

// ================================================
// STAT CARD PROPS
// ================================================

export interface StatCardData {
  title: string
  value: number | string
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label: string
  }
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
}

// ================================================
// USER TABLE TYPES
// ================================================

export interface UserTableColumn {
  key: keyof UserWithStats | 'actions'
  label: string
  sortable?: boolean
  render?: (user: UserWithStats) => React.ReactNode
}

export interface UserTableAction {
  label: string
  icon?: React.ReactNode
  onClick: (user: UserWithStats) => void
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
  disabled?: (user: UserWithStats) => boolean
}

// ================================================
// PERMISSION HELPERS
// ================================================

export interface AdminPermissions {
  canEditUsers: boolean
  canDeleteUsers: boolean
  canChangeRoles: boolean
  canViewStats: boolean
  canManageAllCards: boolean
  canManageAllVideos: boolean
}

export const getAdminPermissions = (currentUser: User | null): AdminPermissions => {
  const isAdmin = currentUser?.role === 'admin'

  return {
    canEditUsers: isAdmin,
    canDeleteUsers: isAdmin,
    canChangeRoles: isAdmin,
    canViewStats: isAdmin,
    canManageAllCards: isAdmin,
    canManageAllVideos: isAdmin
  }
}

// ================================================
// ROLE & STATUS UTILITIES
// ================================================

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  user: 'Usuário',
  consultor: 'Consultor'
}

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  user: 'bg-blue-100 text-blue-800 border-blue-200',
  consultor: 'bg-purple-100 text-purple-800 border-purple-200'
}

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo'
}

export const STATUS_COLORS: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200'
}

// ================================================
// HISTORICAL DATA TYPES
// ================================================

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
  success: boolean
  data: HistoricalDataPoint[]
  period: TimePeriod
  total: number
}

export interface UsersHistoricalResponse {
  success: boolean
  data: HistoricalDataPoint[]
  period: TimePeriod
  total: number
}

// Labels para os períodos
export const PERIOD_LABELS: Record<TimePeriod, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
  year: 'Ano',
  all: 'Geral'
}
