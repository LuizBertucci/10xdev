// ================================================
// AUTH TYPES - Sistema de Autenticação
// ================================================

import { User as SupabaseUser, Session } from '@supabase/supabase-js'

/**
 * Perfil completo do usuário
 */
export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Usuário autenticado (combina Supabase User + Profile)
 */
export interface AuthUser extends SupabaseUser {
  profile?: UserProfile
}

/**
 * Dados para criação de conta
 */
export interface SignUpData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

/**
 * Dados para login
 */
export interface SignInData {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * Dados para recuperação de senha
 */
export interface ForgotPasswordData {
  email: string
}

/**
 * Dados para redefinição de senha
 */
export interface ResetPasswordData {
  password: string
  confirmPassword: string
}

/**
 * Estado de autenticação
 */
export interface AuthState {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  initialized: boolean
}

/**
 * Contexto de autenticação
 */
export interface AuthContextType extends AuthState {
  signIn: (data: SignInData) => Promise<AuthResult>
  signUp: (data: SignUpData) => Promise<AuthResult>
  signOut: () => Promise<void>
  forgotPassword: (data: ForgotPasswordData) => Promise<AuthResult>
  resetPassword: (data: ResetPasswordData) => Promise<AuthResult>
  updateProfile: (data: Partial<UserProfile>) => Promise<AuthResult>
  refreshSession: () => Promise<void>
}

/**
 * Resultado de operações de autenticação
 */
export interface AuthResult {
  success: boolean
  error?: string
  user?: AuthUser
}

/**
 * Erros comuns de autenticação
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  EMAIL_ALREADY_EXISTS = 'email_already_exists',
  WEAK_PASSWORD = 'weak_password',
  USER_NOT_FOUND = 'user_not_found',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}
