'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Zap } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/AuthContext'

// Schema de validação (padrão brasileiro)
const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('Por favor, informe um e-mail válido'),
  password: z
    .string()
    .min(3, 'A senha deve ter pelo menos 3 caracteres'),
  confirmPassword: z
    .string()
    .min(1, 'Por favor, confirme sua senha'),
  first_name: z
    .string()
    .min(2, 'O nome deve ter pelo menos 2 caracteres')
    .max(50, 'O nome deve ter menos de 50 caracteres'),
  last_name: z
    .string()
    .min(2, 'O sobrenome deve ter pelo menos 2 caracteres')
    .max(50, 'O sobrenome deve ter menos de 50 caracteres'),
  role: z.enum(['user', 'admin']).optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

interface RegisterProps {
  onSuccess?: () => void
  redirectTo?: string
}

export default function Register({ onSuccess, redirectTo }: RegisterProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const { register: registerUser, isLoading } = useAuth()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'user'
    }
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('')
      const { confirmPassword, ...registerData } = data
      const success = await registerUser(registerData)
      
      if (success) {
        onSuccess?.()
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro durante o cadastro')
    }
  }

  const isFormLoading = isLoading || isSubmitting

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-lg shadow-lg border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center pb-4">
          {/* 10xDev Logo */}
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
          
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">
              Junte-se à 10xDev
            </CardTitle>
            <CardDescription className="text-gray-600 text-sm">
              Crie sua conta para começar
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-medium text-gray-700">
                  Nome
                </Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="João"
                  {...register('first_name')}
                  disabled={isFormLoading}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-medium text-gray-700">
                  Sobrenome
                </Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Silva"
                  {...register('last_name')}
                  disabled={isFormLoading}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Endereço de E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="joao.silva@exemplo.com"
                {...register('email')}
                disabled={isFormLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Role Field */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Tipo de Conta
              </Label>
              <Select
                defaultValue="user"
                onValueChange={(value: 'user' | 'admin') => setValue('role', value)}
                disabled={isFormLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Crie uma senha"
                  className="pr-10"
                  {...register('password')}
                  disabled={isFormLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  disabled={isFormLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirme sua senha"
                  className="pr-10"
                  {...register('confirmPassword')}
                  disabled={isFormLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  disabled={isFormLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isFormLoading}
            >
              {isFormLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Criando conta...</span>
                </div>
              ) : (
                'Criar Conta'
              )}
            </Button>

            {/* Requisitos da Senha */}
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-xs text-green-800 font-medium mb-1">Requisitos da Senha:</p>
              <ul className="text-xs text-green-700">
                <li>• Pelo menos 3 caracteres</li>
              </ul>
            </div>
          </form>

          {/* Sign in link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link 
                href="/login" 
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Entre aqui
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}