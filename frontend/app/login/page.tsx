'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getDefaultRoute } from '@/utils/routes'
import { Zap, Code, Shield, TrendingUp, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Se já autenticado, redirecionar para home com tab ou query param redirect
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const redirect = searchParams.get('redirect')
      if (redirect) {
        router.push(redirect)
      } else {
        // Redirecionar para home (tela inicial - default após login)
        router.push(getDefaultRoute())
      }
    }
  }, [isAuthenticated, isLoading, router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Por favor, preencha todos os campos')
      return
    }

    setIsSubmitting(true)
    try {
      await login({ email, password })
      toast.success('Login realizado com sucesso!')
      const redirect = searchParams.get('redirect')
      if (redirect) {
        router.push(redirect)
      } else {
        // Redirecionar para home (tela inicial - default após login)
        router.push(getDefaultRoute())
      }
    } catch (error: any) {
      console.error('Erro no login:', error)
      toast.error(error.message || 'Credenciais inválidas. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Coluna Esquerda - Branding */}
      <div className="hidden lg:flex lg:w-[40%] bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center">
              <Zap className="w-8 h-8" />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-4xl font-bold text-center">10xDev</h1>

          {/* Descrição */}
          <p className="text-lg text-center text-white/90 leading-relaxed">
            Junte-se à plataforma que acelera seu desenvolvimento. Acesse snippets de código, videoaulas e projetos práticos para elevar suas habilidades.
          </p>

          {/* Features */}
          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Code className="w-5 h-5" />
              </div>
              <span className="text-base">Snippets organizados por tecnologia</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-base">Aprendizado estruturado e progressivo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-base">Aumente sua produtividade como desenvolvedor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coluna Direita - Formulário */}
      <div className="flex-1 flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">Entrar na sua conta</h2>
              <p className="text-sm text-purple-600">
                <Link href="/register" className="hover:underline">
                  Ou crie uma nova conta
                </Link>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="h-11"
                />
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Botão Submit */}
              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

