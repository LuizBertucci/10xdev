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
