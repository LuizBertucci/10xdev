'use client'

import { LogOut, User as UserIcon, Shield, Zap } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useAuth } from './AuthContext'

export default function UserProfile() {
  const { user, logout, isLoading } = useAuth()

  if (!user) {
    return null
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-8 h-8 text-white" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-gray-900">x</span>
            </div>
          </div>
        </div>
        <CardTitle className="text-xl font-bold text-gray-900">
          Bem-vindo à 10xDev
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <UserIcon className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user.email
                }
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-gray-500" />
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Perfil:</span>
              <Badge 
                variant={user.role === 'admin' ? 'destructive' : 'secondary'}
                className="capitalize"
              >
                {user.role === 'admin' ? 'Administrador' : 'Usuário'}
              </Badge>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
            <p><strong>Status da Conta:</strong> {user.is_active ? 'Ativa' : 'Inativa'}</p>
            <p><strong>Membro desde:</strong> {new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
            <p><strong>ID do Usuário:</strong> {user.id}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleLogout}
            disabled={isLoading}
            variant="outline"
            className="w-full flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoading ? 'Saindo...' : 'Sair'}</span>
          </Button>
        </div>

        {/* Aviso de Privilégios Admin */}
        {user.role === 'admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800 font-medium">Acesso Administrativo</p>
            <p className="text-xs text-blue-700">
              Você possui privilégios de administrador. Pode gerenciar usuários e acessar todas as funcionalidades.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}