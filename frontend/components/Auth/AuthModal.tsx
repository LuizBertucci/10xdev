'use client'

import { useState } from 'react'
import { X, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      setError('Email e senha são obrigatórios')
      return false
    }

    if (mode === 'register') {
      if (!formData.name) {
        setError('Nome é obrigatório')
        return false
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem')
        return false
      }
      
      if (formData.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const success = await login(formData.email, formData.password)
        
        if (success) {
          console.log('✅ Login bem-sucedido!')
          onSuccess?.()
          onClose()
        } else {
          setError('Credenciais inválidas')
        }
      } else {
        const success = await register(formData.email, formData.password, formData.name)
        
        if (success) {
          console.log('✅ Registro bem-sucedido!')
          onSuccess?.()
          onClose()
        } else {
          setError('Erro ao criar conta')
        }
      }
    } catch (error: any) {
      setError('Erro de conexão com o servidor')
      console.error('❌ Auth error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setFormData({ email: '', password: '', name: '', confirmPassword: '' })
  }

  const isLogin = mode === 'login'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200 dark:border-gray-700">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-10"
          >
            <X size={20} className="text-gray-500" />
          </button>

          <div className="flex flex-col items-center w-full">
            {/* Logo 10xdev */}
            <div className="mb-4">
              <img 
                src="/10xdev-logo.svg" 
                alt="10xDev Logo" 
                className="h-12 w-auto"
              />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isLogin ? 'Entrar na Plataforma' : 'Criar Conta'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isLogin ? 'Acesse suas aulas exclusivas' : 'Junte-se à comunidade de desenvolvedores'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome (apenas registro) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           placeholder-gray-400 transition-all"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-400 transition-all"
                required
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Sua senha"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-400 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirmar Senha (apenas registro) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirme sua senha"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           placeholder-gray-400 transition-all"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl
                     hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center space-x-2 font-medium transition-all"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                <span>{isLogin ? 'Entrar' : 'Criar Conta'}</span>
              </>
            )}
          </button>

          {/* Switch Mode */}
          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              <button
                type="button"
                onClick={switchMode}
                className="ml-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                {isLogin ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
          </div>

          {/* Demo Credentials */}
          {isLogin && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                Credenciais de demonstração:
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <div>👑 <strong>Admin:</strong> admin@10xdev.com / 123456</div>
                <div>👤 <strong>Usuário:</strong> user@10xdev.com / 123456</div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}