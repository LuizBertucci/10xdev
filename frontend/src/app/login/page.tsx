'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Brand/Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-800 p-12 text-white flex-col justify-center">
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Zap className="w-12 h-12 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-4 text-center">
            10xDev
          </h1>

          {/* Description */}
          <p className="text-xl text-blue-100 leading-relaxed text-center mb-8">
            Plataforma completa de desenvolvimento. Aprenda, pratique e domine as tecnologias mais modernas do mercado.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-blue-100">
                Conteúdos práticos e direto ao ponto
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-blue-100">
                Projetos reais para seu portfólio
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-blue-100">
                Comunidade de desenvolvedores 10x
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">10xDev</h1>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-gray-600">
                Faça login para continuar sua jornada
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white text-gray-900"
                  disabled={isLoading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-white text-gray-900"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Link
                  href="/registrar"
                  className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Crie sua conta
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-500">
            © 2024 10xDev. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
