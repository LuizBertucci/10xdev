"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAdmin } from '@/hooks/useAdmin'
import { SystemStatsCard } from '@/components/admin/SystemStatsCard'
import { UserManagementTable } from '@/components/admin/UserManagementTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Code2,
  FolderGit2,
  UserCheck,
  UserX,
  ShieldCheck,
  TrendingUp,
  Calendar
} from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function AdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    users,
    stats,
    loading,
    loadingStats,
    updating,
    deleting,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    refreshAll
  } = useAdmin()

  // Verificar se o usuário é admin
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando painel administrativo...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <ProtectedRoute requireRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
              Painel de Controle Administrativo
            </h1>
            <p className="mt-2 text-muted-foreground">
              Gerencie usuários, visualize estatísticas e controle o sistema
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="users">Gerenciar Usuários</TabsTrigger>
            </TabsList>

            {/* Tab: Visão Geral */}
            <TabsContent value="overview" className="space-y-6">
              {/* Cards de Estatísticas */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SystemStatsCard
                  title="Total de Usuários"
                  value={stats?.totalUsers || 0}
                  subtitle={`${stats?.activeUsers || 0} ativos, ${stats?.inactiveUsers || 0} inativos`}
                  icon={Users}
                  trend={{
                    value: stats?.usersThisWeek || 0,
                    direction: (stats?.usersThisWeek || 0) > 0 ? 'up' : 'neutral',
                    label: 'novos esta semana'
                  }}
                  color="blue"
                />

                <SystemStatsCard
                  title="Administradores"
                  value={stats?.adminUsers || 0}
                  subtitle="Usuários com permissões admin"
                  icon={ShieldCheck}
                  color="purple"
                />

                <SystemStatsCard
                  title="Total de Cards"
                  value={stats?.totalCards || 0}
                  subtitle={`${stats?.cardsThisMonth || 0} criados este mês`}
                  icon={Code2}
                  trend={{
                    value: stats?.cardsThisWeek || 0,
                    direction: (stats?.cardsThisWeek || 0) > 0 ? 'up' : 'neutral',
                    label: 'novos esta semana'
                  }}
                  color="green"
                />

                <SystemStatsCard
                  title="Total de Projetos"
                  value={stats?.totalProjects || 0}
                  subtitle="Projetos no sistema"
                  icon={FolderGit2}
                  color="orange"
                />
              </div>

              {/* Estatísticas Detalhadas */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Atividade Recente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Atividade Recente
                    </CardTitle>
                    <CardDescription>
                      Resumo da atividade dos últimos 30 dias
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Novos usuários (mês)</span>
                      </div>
                      <span className="font-semibold">{stats?.usersThisMonth || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Cards criados (mês)</span>
                      </div>
                      <span className="font-semibold">{stats?.cardsThisMonth || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Cards criados (semana)</span>
                      </div>
                      <span className="font-semibold">{stats?.cardsThisWeek || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Status dos Usuários */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Status dos Usuários
                    </CardTitle>
                    <CardDescription>
                      Distribuição de usuários por status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Usuários ativos</span>
                      </div>
                      <span className="font-semibold text-green-600">
                        {stats?.activeUsers || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">Usuários inativos</span>
                      </div>
                      <span className="font-semibold text-gray-600">
                        {stats?.inactiveUsers || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">Administradores</span>
                      </div>
                      <span className="font-semibold text-purple-600">
                        {stats?.adminUsers || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Gerenciar Usuários */}
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciamento de Usuários</CardTitle>
                  <CardDescription>
                    Visualize, edite e gerencie todos os usuários do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserManagementTable
                    users={users}
                    currentUserId={user.id}
                    onUpdateRole={updateUserRole}
                    onUpdateStatus={updateUserStatus}
                    onDeleteUser={deleteUser}
                    loading={loading || updating || deleting}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
}
