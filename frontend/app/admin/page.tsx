"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAdmin } from '@/hooks/useAdmin'
import { useDebounceSearch } from '@/hooks/useDebounceSearch'
import { SystemStatsCard } from '@/components/admin/SystemStatsCard'
import { UserManagementTable } from '@/components/admin/UserManagementTable'
import { UserFilters } from '@/components/admin/UserFilters'
import { GrowthChart } from '@/components/admin/charts/GrowthChart'
import { UserActivityChart } from '@/components/admin/charts/UserActivityChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
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
import type { UserRole, UserStatus } from '@/types/admin'

export default function AdminPage() {
  return (
    <ProtectedRoute requireRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  )
}

function AdminDashboard() {
  const { user } = useAuth()
  const {
    users,
    stats,
    loading,
    loadingStats,
    error,
    updating,
    deleting,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    refreshAll
  } = useAdmin()

  // =========================================================
  // DEV DIAGNOSTICS (only in development)
  // =========================================================
  const isDev = process.env.NODE_ENV === 'development'
  const apiBaseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3001/api'
      : 'https://api.10xdev.com.br/api'

  const mountTsRef = useRef<number>(Date.now())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [health, setHealth] = useState<{ ok: boolean; status?: number; ms?: number; error?: string } | null>(null)

  useEffect(() => {
    if (!isDev) return
    const id = window.setInterval(() => setElapsedMs(Date.now() - mountTsRef.current), 250)
    return () => window.clearInterval(id)
  }, [isDev])

  useEffect(() => {
    if (!isDev) return
    let cancelled = false
    const controller = new AbortController()
    const startedAt = performance.now()

    const run = async () => {
      try {
        const timeoutId = window.setTimeout(() => controller.abort(), 4000)
        const res = await fetch(`${apiBaseUrl}/health`, { signal: controller.signal })
        window.clearTimeout(timeoutId)
        const ms = Math.round(performance.now() - startedAt)
        if (!cancelled) setHealth({ ok: res.ok, status: res.status, ms })
      } catch (e: any) {
        const ms = Math.round(performance.now() - startedAt)
        if (!cancelled) setHealth({ ok: false, ms, error: e?.name === 'AbortError' ? 'timeout' : (e?.message || 'erro') })
      }
    }

    run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isDev, apiBaseUrl])

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')

  // Debounced search
  const debouncedSearch = useDebounceSearch(searchTerm, 300)

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Filtro de busca (nome ou email)
      const matchesSearch = debouncedSearch === '' ||
        user.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearch.toLowerCase())

      // Filtro de role
      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      // Filtro de status
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, debouncedSearch, roleFilter, statusFilter])

  const isInitialLoading = (loading || loadingStats) && users.length === 0 && !stats && !error

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando painel administrativo...</p>
          {isDev && (
            <div className="mt-4 text-xs text-muted-foreground space-y-1">
              <div>Diagnóstico (dev):</div>
              <div>API: {apiBaseUrl}</div>
              <div>Mount: {(elapsedMs / 1000).toFixed(1)}s</div>
              <div>Em andamento: {loading ? '/admin/users' : loadingStats ? '/admin/stats' : '—'}</div>
              <div>
                Health: {health ? (health.ok ? `ok (${health.status}) ${health.ms}ms` : `falha ${health.status ?? ''} ${health.ms}ms (${health.error})`) : 'checando...'}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Não foi possível carregar o Painel</CardTitle>
            <CardDescription>
              O painel não conseguiu buscar os dados necessários. Abaixo está a mensagem retornada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => refreshAll()} disabled={loading || loadingStats}>
                Tentar novamente
              </Button>
              {isDev && (
                <div className="text-xs text-muted-foreground">
                  API: {apiBaseUrl} • Health: {health ? (health.ok ? `ok ${health.ms}ms` : `falha ${health.ms}ms (${health.error})`) : '—'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
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
          {isDev && (
            <div className="mt-3 text-xs text-muted-foreground">
              API: {apiBaseUrl} • Health: {health ? (health.ok ? `ok (${health.status}) ${health.ms}ms` : `falha ${health.status ?? ''} ${health.ms}ms (${health.error})`) : 'checando...'}
              {(loading || loadingStats) ? ` • carregando: ${loading ? '/admin/users' : loadingStats ? '/admin/stats' : '—'}` : ''}
            </div>
          )}
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

            {/* Gráfico de Crescimento */}
            <div className="grid gap-4">
              <GrowthChart users={users} />
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
              <CardContent className="space-y-6">
                {/* Filters */}
                <UserFilters
                  searchTerm={searchTerm}
                  roleFilter={roleFilter}
                  statusFilter={statusFilter}
                  onSearchChange={setSearchTerm}
                  onRoleFilterChange={setRoleFilter}
                  onStatusFilterChange={setStatusFilter}
                  totalUsers={users.length}
                  filteredCount={filteredUsers.length}
                />

                {/* User Table */}
                <UserManagementTable
                  users={filteredUsers}
                  currentUserId={user?.id || ''}
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
  )
}
