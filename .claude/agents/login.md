---
name: login-specialist
description: Especialista em implementação do sistema de autenticação com Supabase Auth para o projeto 10xDev
tools: Read, Edit, MultiEdit, Write, Grep, Glob, Bash
---

# Sistema de Autenticação - Login e Criação de Conta

Documento de especificação completo para implementação do sistema de autenticação do projeto 10xDev utilizando Supabase Auth.

## 📋 Visão Geral

Sistema de autenticação completo com login, criação de conta e gerenciamento de sessão utilizando Supabase Auth. A implementação seguirá os padrões arquiteturais existentes no projeto 10xDev.

### Objetivos
- ✅ Tela de login com email e senha
- ✅ Tela de criação de conta com validação
- ✅ Integração com Supabase Auth
- ✅ Gerenciamento de sessão persistente
- ✅ Proteção de rotas autenticadas
- ✅ UI/UX consistente com shadcn/ui

---

## 🎯 Especificação Funcional

### 1. Campos do Formulário de Cadastro

#### Dados Obrigatórios
```typescript
interface SignUpData {
  firstName: string      // Nome (min: 2 caracteres)
  lastName: string       // Sobrenome (min: 2 caracteres)
  email: string          // Email válido
  password: string       // Senha (min: 6 caracteres)
  confirmPassword: string // Confirmação de senha
}
```

#### Validações
- **Nome**: Mínimo 2 caracteres, apenas letras e espaços
- **Sobrenome**: Mínimo 2 caracteres, apenas letras e espaços
- **Email**: Formato de email válido (regex padrão)
- **Senha**: Mínimo 6 caracteres, sem validação de complexidade adicional
- **Confirmar Senha**: Deve ser igual à senha

### 2. Campos do Formulário de Login

```typescript
interface SignInData {
  email: string
  password: string
  rememberMe?: boolean  // Opcional: Manter conectado
}
```

#### Validações
- **Email**: Formato de email válido
- **Senha**: Campo obrigatório (sem validação de comprimento no login)

### 3. Funcionalidades Adicionais

- **Esqueci minha senha**: Link para recuperação (implementado via Supabase)
- **Toggle de visibilidade da senha**: Mostrar/ocultar senha
- **Validação em tempo real**: Feedback visual durante digitação
- **Loading states**: Indicadores durante requisições
- **Error handling**: Mensagens de erro claras e amigáveis

---

## 🏗️ Arquitetura da Implementação

### Stack Tecnológica

#### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Validação**: Zod + React Hook Form
- **State Management**: Custom hooks + Context API
- **Icons**: lucide-react

#### Backend
- **Auth Provider**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **Session**: Supabase Session Management
- **API**: Supabase Client (já configurado)

### Estrutura de Pastas

```
frontend/
├── app/
│   ├── (auth)/                    # Grupo de rotas de autenticação
│   │   ├── login/
│   │   │   └── page.tsx          # Página de login
│   │   ├── signup/
│   │   │   └── page.tsx          # Página de cadastro
│   │   ├── forgot-password/
│   │   │   └── page.tsx          # Recuperação de senha
│   │   └── layout.tsx            # Layout para páginas de auth
│   └── (protected)/              # Rotas protegidas
│       └── layout.tsx            # Layout com proteção de auth
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx         # Formulário de login
│   │   ├── SignUpForm.tsx        # Formulário de cadastro
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── PasswordInput.tsx     # Input com toggle de visibilidade
│   │   └── AuthProvider.tsx      # Provider de autenticação
│   └── ui/                       # Componentes shadcn/ui existentes
│
├── hooks/
│   ├── useAuth.ts                # Hook principal de autenticação
│   ├── useSupabaseClient.ts      # Client Supabase no frontend
│   └── useUser.ts                # Hook para dados do usuário
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Configuração do Supabase Client
│   │   ├── server.ts             # Configuração do Supabase Server
│   │   └── middleware.ts         # Middleware de autenticação
│   └── validations/
│       └── auth.ts               # Schemas Zod para validação
│
├── types/
│   └── auth.ts                   # Tipos TypeScript de autenticação
│
└── services/
    └── authService.ts            # Serviço de autenticação

backend/
├── src/
│   ├── middleware/
│   │   └── authMiddleware.ts     # Middleware para verificar JWT
│   ├── types/
│   │   └── auth.ts               # Tipos compartilhados
│   └── utils/
│       └── supabaseAuth.ts       # Utilitários de autenticação
```

---

## 📝 Detalhamento da Implementação

### 1. Database Schema (Supabase)

#### Tabela `profiles` (Complementar ao auth.users)

```sql
-- Extensão da tabela de usuários do Supabase Auth
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ler apenas seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

### 2. Frontend - Types (frontend/types/auth.ts)

```typescript
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
```

### 3. Frontend - Validation Schemas (frontend/lib/validations/auth.ts)

```typescript
import { z } from 'zod'

/**
 * Schema de validação para Sign Up
 */
export const signUpSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),

  lastName: z
    .string()
    .min(2, 'Sobrenome deve ter no mínimo 2 caracteres')
    .max(50, 'Sobrenome deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Sobrenome deve conter apenas letras'),

  email: z
    .string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres'),

  confirmPassword: z
    .string()
    .min(6, 'Confirmação de senha é obrigatória')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
})

/**
 * Schema de validação para Sign In
 */
export const signInSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(1, 'Senha é obrigatória'),

  rememberMe: z.boolean().optional()
})

/**
 * Schema de validação para Forgot Password
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .toLowerCase()
    .trim()
})

/**
 * Schema de validação para Reset Password
 */
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres'),

  confirmPassword: z
    .string()
    .min(6, 'Confirmação de senha é obrigatória')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
})

// Export types inferred from schemas
export type SignUpFormData = z.infer<typeof signUpSchema>
export type SignInFormData = z.infer<typeof signInSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
```

### 4. Frontend - Supabase Client (frontend/lib/supabase/client.ts)

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

/**
 * Cria um cliente Supabase para uso no browser (Client Components)
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Cliente Supabase singleton para uso direto
 */
export const supabase = createClient()
```

### 5. Frontend - Supabase Server (frontend/lib/supabase/server.ts)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

/**
 * Cria um cliente Supabase para uso no servidor (Server Components)
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Cookies can only be modified in Server Actions or Route Handlers
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete({ name, ...options })
          } catch (error) {
            // Cookies can only be modified in Server Actions or Route Handlers
          }
        },
      },
    }
  )
}
```

### 6. Frontend - Auth Service (frontend/services/authService.ts)

```typescript
import { supabase } from '@/lib/supabase/client'
import {
  SignUpData,
  SignInData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthResult,
  UserProfile
} from '@/types/auth'

/**
 * Serviço de autenticação usando Supabase Auth
 */
class AuthService {
  /**
   * Criar nova conta
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const { email, password, firstName, lastName } = data

      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        return {
          success: false,
          error: this.handleAuthError(error.message),
        }
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Erro ao criar conta',
        }
      }

      return {
        success: true,
        user: authData.user,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Fazer login
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const { email, password } = data

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return {
          success: false,
          error: this.handleAuthError(error.message),
        }
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Erro ao fazer login',
        }
      }

      return {
        success: true,
        user: authData.user,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Fazer logout
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  /**
   * Solicitar recuperação de senha
   */
  async forgotPassword(data: ForgotPasswordData): Promise<AuthResult> {
    try {
      const { email } = data

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        return {
          success: false,
          error: this.handleAuthError(error.message),
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Redefinir senha
   */
  async resetPassword(data: ResetPasswordData): Promise<AuthResult> {
    try {
      const { password } = data

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        return {
          success: false,
          error: this.handleAuthError(error.message),
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Obter usuário atual
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  /**
   * Obter sessão atual
   */
  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  /**
   * Buscar perfil do usuário
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<AuthResult> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          avatar_url: updates.avatarUrl,
        })
        .eq('id', userId)

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Traduzir mensagens de erro do Supabase
   */
  private handleAuthError(errorMessage: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Email ou senha incorretos',
      'User already registered': 'Este email já está cadastrado',
      'Email not confirmed': 'Por favor, confirme seu email',
      'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres',
      'Unable to validate email address': 'Email inválido',
    }

    return errorMap[errorMessage] || errorMessage
  }
}

export const authService = new AuthService()
```

### 7. Frontend - Auth Hook (frontend/hooks/useAuth.ts)

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { authService } from '@/services/authService'
import {
  AuthContextType,
  AuthState,
  SignUpData,
  SignInData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthResult,
  UserProfile
} from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Provider de autenticação
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  })

  useEffect(() => {
    // Verificar sessão inicial
    const initializeAuth = async () => {
      try {
        const session = await authService.getCurrentSession()
        const user = await authService.getCurrentUser()

        if (user && session) {
          const profile = await authService.getUserProfile(user.id)
          setState({
            user: { ...user, profile: profile || undefined },
            session,
            loading: false,
            initialized: true,
          })
        } else {
          setState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          })
        }
      } catch (error) {
        setState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
        })
      }
    }

    initializeAuth()

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await authService.getUserProfile(session.user.id)
          setState({
            user: { ...session.user, profile: profile || undefined },
            session,
            loading: false,
            initialized: true,
          })
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          })
        } else if (event === 'USER_UPDATED' && session?.user) {
          const profile = await authService.getUserProfile(session.user.id)
          setState({
            user: { ...session.user, profile: profile || undefined },
            session,
            loading: false,
            initialized: true,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (data: SignUpData): Promise<AuthResult> => {
    setState(prev => ({ ...prev, loading: true }))
    const result = await authService.signUp(data)
    setState(prev => ({ ...prev, loading: false }))

    if (result.success) {
      router.push('/auth/verify-email')
    }

    return result
  }

  const signIn = async (data: SignInData): Promise<AuthResult> => {
    setState(prev => ({ ...prev, loading: true }))
    const result = await authService.signIn(data)
    setState(prev => ({ ...prev, loading: false }))

    if (result.success) {
      router.push('/dashboard')
    }

    return result
  }

  const signOut = async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }))
    await authService.signOut()
    setState(prev => ({ ...prev, loading: false }))
    router.push('/login')
  }

  const forgotPassword = async (data: ForgotPasswordData): Promise<AuthResult> => {
    return authService.forgotPassword(data)
  }

  const resetPassword = async (data: ResetPasswordData): Promise<AuthResult> => {
    return authService.resetPassword(data)
  }

  const updateProfile = async (data: Partial<UserProfile>): Promise<AuthResult> => {
    if (!state.user) {
      return { success: false, error: 'Usuário não autenticado' }
    }
    return authService.updateUserProfile(state.user.id, data)
  }

  const refreshSession = async (): Promise<void> => {
    const session = await authService.getCurrentSession()
    const user = await authService.getCurrentUser()

    if (user && session) {
      const profile = await authService.getUserProfile(user.id)
      setState({
        user: { ...user, profile: profile || undefined },
        session,
        loading: false,
        initialized: true,
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        forgotPassword,
        resetPassword,
        updateProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook para acessar o contexto de autenticação
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### 8. Frontend - Login Form Component (frontend/components/auth/LoginForm.tsx)

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { signInSchema, SignInFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function LoginForm() {
  const { signIn, loading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async (data: SignInFormData) => {
    setError(null)
    const result = await signIn(data)

    if (!result.success) {
      setError(result.error || 'Erro ao fazer login')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          {...register('email')}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••"
            autoComplete="current-password"
            {...register('password')}
            className={errors.password ? 'border-red-500' : ''}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox id="rememberMe" {...register('rememberMe')} />
          <Label
            htmlFor="rememberMe"
            className="text-sm font-normal cursor-pointer"
          >
            Manter conectado
          </Label>
        </div>
        <Link
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || loading}
      >
        {isSubmitting || loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Não tem uma conta?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  )
}
```

### 9. Frontend - Sign Up Form Component (frontend/components/auth/SignUpForm.tsx)

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { signUpSchema, SignUpFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function SignUpForm() {
  const { signUp, loading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: SignUpFormData) => {
    setError(null)
    const result = await signUp(data)

    if (!result.success) {
      setError(result.error || 'Erro ao criar conta')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nome</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="João"
            autoComplete="given-name"
            {...register('firstName')}
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && (
            <p className="text-sm text-red-500">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Sobrenome</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Silva"
            autoComplete="family-name"
            {...register('lastName')}
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && (
            <p className="text-sm text-red-500">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          {...register('email')}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••"
            autoComplete="new-password"
            {...register('password')}
            className={errors.password ? 'border-red-500' : ''}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className={errors.confirmPassword ? 'border-red-500' : ''}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || loading}
      >
        {isSubmitting || loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Criando conta...
          </>
        ) : (
          'Criar conta'
        )}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Já tem uma conta?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Fazer login
        </Link>
      </p>
    </form>
  )
}
```

### 10. Middleware de Proteção de Rotas (frontend/middleware.ts)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Rotas públicas (não requerem autenticação)
 */
const publicRoutes = ['/login', '/signup', '/forgot-password', '/auth/callback']

/**
 * Rotas de autenticação (redireciona para dashboard se já autenticado)
 */
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Se é rota de auth e usuário já está autenticado, redireciona para dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Se não é rota pública e usuário não está autenticado, redireciona para login
  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
```

---

## 🔒 Backend - Middleware de Autenticação

### backend/src/middleware/authMiddleware.ts

```typescript
import { Request, Response, NextFunction } from 'express'
import { supabase } from '@/database/supabase'

/**
 * Interface estendida do Request com usuário
 */
export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role?: string
  }
}

/**
 * Middleware para verificar JWT do Supabase
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido'
      })
    }

    const token = authHeader.split(' ')[1]

    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      })
    }

    // Adicionar usuário ao request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role
    }

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Erro na autenticação'
    })
  }
}

/**
 * Middleware opcional de autenticação (não bloqueia se não houver token)
 */
export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await supabase.auth.getUser(token)

      if (user) {
        req.user = {
          id: user.id,
          email: user.email || '',
          role: user.role
        }
      }
    }

    next()
  } catch (error) {
    next()
  }
}
```

---

## 🎨 UI/UX Guidelines

### Design System
- **Cores**: Utilizar o tema existente do projeto (via Tailwind)
- **Tipografia**: Fonte padrão do projeto
- **Espaçamento**: Consistente com shadcn/ui (4, 8, 16, 24, 32px)
- **Feedback Visual**: Loading states, error states, success messages

### Responsividade
- **Mobile First**: Design otimizado para mobile
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Layout**: Centrado, max-width de 400px para formulários

### Acessibilidade
- **ARIA Labels**: Todos os inputs com labels apropriados
- **Keyboard Navigation**: Tab order correto
- **Error Messages**: Claras e associadas aos campos
- **Color Contrast**: WCAG AA compliance

---

## 📦 Variáveis de Ambiente

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (.env)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## ✅ Checklist de Implementação

### Setup Inicial
- [ ] Instalar dependências necessárias (@supabase/ssr, @supabase/supabase-js)
- [ ] Configurar variáveis de ambiente
- [ ] Criar schema do banco de dados (tabela profiles + triggers)
- [ ] Configurar Row Level Security (RLS)

### Backend
- [ ] Criar tipos TypeScript de autenticação
- [ ] Implementar authMiddleware.ts
- [ ] Adicionar middleware às rotas protegidas
- [ ] Testar proteção de endpoints

### Frontend - Configuração Base
- [ ] Criar arquivos de configuração Supabase (client.ts, server.ts)
- [ ] Criar tipos TypeScript (types/auth.ts)
- [ ] Criar schemas de validação Zod (lib/validations/auth.ts)
- [ ] Implementar authService.ts
- [ ] Implementar useAuth hook e AuthProvider
- [ ] Configurar middleware.ts para proteção de rotas

### Frontend - Componentes de UI
- [ ] Criar LoginForm.tsx
- [ ] Criar SignUpForm.tsx
- [ ] Criar ForgotPasswordForm.tsx (opcional)
- [ ] Criar PasswordInput.tsx (componente reutilizável)

### Frontend - Páginas
- [ ] Criar página /login
- [ ] Criar página /signup
- [ ] Criar página /forgot-password
- [ ] Criar página /auth/callback (para email confirmation)
- [ ] Criar página /auth/verify-email (mensagem de verificação)
- [ ] Criar layout (auth) para páginas de autenticação

### Integração
- [ ] Envolver app com AuthProvider em layout.tsx
- [ ] Testar fluxo completo de sign up
- [ ] Testar fluxo completo de sign in
- [ ] Testar fluxo de logout
- [ ] Testar proteção de rotas
- [ ] Testar recuperação de senha
- [ ] Testar persistência de sessão

### Testes
- [ ] Validar todos os campos de formulário
- [ ] Testar mensagens de erro
- [ ] Testar estados de loading
- [ ] Testar responsividade mobile
- [ ] Testar acessibilidade (keyboard navigation)
- [ ] Testar em diferentes navegadores

### Documentação
- [ ] Documentar fluxos de autenticação
- [ ] Documentar API endpoints protegidos
- [ ] Atualizar README com instruções de auth

---

## 🚀 Ordem de Implementação Sugerida

1. **Setup Database** (30 min)
   - Criar tabela profiles
   - Configurar RLS
   - Criar triggers

2. **Backend Middleware** (30 min)
   - Implementar authMiddleware.ts
   - Adicionar tipos TypeScript

3. **Frontend Base** (1h)
   - Configurar Supabase client
   - Criar tipos e validações
   - Implementar authService

4. **Auth Hook & Context** (45 min)
   - Implementar useAuth
   - Criar AuthProvider
   - Testar integração

5. **UI Components** (2h)
   - LoginForm
   - SignUpForm
   - PasswordInput
   - Feedback components

6. **Pages & Routing** (1h)
   - Criar páginas de auth
   - Configurar layouts
   - Implementar middleware de rotas

7. **Integration & Testing** (1h)
   - Testes end-to-end
   - Ajustes de UI/UX
   - Correção de bugs

**Total Estimado**: 6-7 horas

---

## 📚 Recursos e Referências

### Documentação Oficial
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [React Hook Form](https://react-hook-form.com)
- [Zod Validation](https://zod.dev)

### Padrões do Projeto
- Seguir estrutura de pastas existente
- Utilizar componentes shadcn/ui
- Manter consistência com useCardFeatures hook
- Aplicar mesmos padrões de error handling

---

## 🔐 Segurança

### Best Practices Implementadas
1. **Password Hashing**: Gerenciado automaticamente pelo Supabase
2. **JWT Tokens**: Tokens seguros com expiração
3. **Row Level Security**: Acesso controlado no banco
4. **HTTPS Only**: Conexões sempre encriptadas
5. **Input Validation**: Validação client-side e server-side
6. **CSRF Protection**: Tokens em cookies httpOnly
7. **Rate Limiting**: Middleware existente do backend

### Considerações Futuras
- Implementar 2FA (Two-Factor Authentication)
- Adicionar OAuth providers (Google, GitHub)
- Implementar rate limiting específico para auth
- Adicionar logging de tentativas de login
- Implementar bloqueio de conta após múltiplas falhas

---

## 🎉 Conclusão

Este documento fornece uma especificação completa e detalhada para implementação do sistema de autenticação. Todos os arquivos, tipos, componentes e lógica estão documentados com código completo e pronto para uso.

A implementação segue rigorosamente os padrões do projeto 10xDev e utiliza as melhores práticas de desenvolvimento React, Next.js e Supabase Auth.
