'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users as UsersIcon, Code2 } from 'lucide-react'
import { useAdminGrowth } from '@/hooks/useAdminGrowth'
import type { TimePeriod, UserWithStats } from '@/types/admin'
import { PERIOD_LABELS } from '@/types/admin'

interface GrowthChartProps {
  users?: UserWithStats[] // Para filtro de usuário
}

export function GrowthChart({ users = [] }: GrowthChartProps) {
  const [period, setPeriod] = useState<TimePeriod>('month')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')

  const {
    cardsData,
    usersData,
    loading,
    fetchCardsHistory,
    fetchUsersHistory
  } = useAdminGrowth(period)

  // Combinar dados para o gráfico
  const chartData = useMemo(() => {
    // Criar um Map de datas com ambos os dados
    const dataMap = new Map<string, { date: string; cards: number; users: number }>()

    // Adicionar dados de cards
    cardsData.forEach(point => {
      if (!dataMap.has(point.date)) {
        dataMap.set(point.date, { date: point.date, cards: 0, users: 0 })
      }
      dataMap.get(point.date)!.cards = point.count
    })

    // Adicionar dados de usuários
    usersData.forEach(point => {
      if (!dataMap.has(point.date)) {
        dataMap.set(point.date, { date: point.date, cards: 0, users: 0 })
      }
      dataMap.get(point.date)!.users = point.count
    })

    // Converter para array e ordenar
    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [cardsData, usersData])

  // Calcular totais
  const totals = useMemo(() => {
    const totalCards = cardsData.reduce((sum, point) => sum + point.count, 0)
    const totalUsers = usersData.reduce((sum, point) => sum + point.count, 0)
    return { cards: totalCards, users: totalUsers }
  }, [cardsData, usersData])

  // Handler para mudança de período
  const handlePeriodChange = async (newPeriod: TimePeriod) => {
    setPeriod(newPeriod)
    const userId = selectedUserId === 'all' ? undefined : selectedUserId
    await Promise.all([
      fetchCardsHistory(newPeriod, userId),
      fetchUsersHistory(newPeriod)
    ])
  }

  // Handler para mudança de usuário
  const handleUserChange = async (userId: string) => {
    setSelectedUserId(userId)
    const userIdParam = userId === 'all' ? undefined : userId
    await fetchCardsHistory(period, userIdParam)
  }

  // Formatar data para exibição
  const formatDate = (dateStr: string): string => {
    if (period === 'day') {
      // Para período diário, mostrar hora
      const [date, time] = dateStr.split(' ')
      const [year, month, day] = date.split('-')
      return `${day}/${month} ${time || ''}`
    } else if (period === 'week' || period === 'month') {
      // Para semana/mês, mostrar dia/mês
      const [year, month, day] = dateStr.split('-')
      return `${day}/${month}`
    } else if (period === 'year' || period === 'all') {
      // Para ano/geral, mostrar mês/ano
      const [year, month] = dateStr.split('-')
      return `${month}/${year}`
    }
    return dateStr
  }

  const chartConfig = {
    cards: {
      label: 'Cards Criados',
      color: 'hsl(var(--chart-1))'
    },
    users: {
      label: 'Usuários Cadastrados',
      color: 'hsl(var(--chart-2))'
    }
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <CardTitle>Crescimento da Plataforma</CardTitle>
          </div>
          <div className="flex gap-2">
            {/* Filtro de usuário (apenas para cards) */}
            {users.length > 0 && (
              <Select value={selectedUserId} onValueChange={handleUserChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Filtro de período */}
            <Select value={period} onValueChange={(v) => handlePeriodChange(v as TimePeriod)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Último Dia</SelectItem>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
                <SelectItem value="year">Último Ano</SelectItem>
                <SelectItem value="all">Geral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription>
          Visualize o crescimento de cards criados e usuários cadastrados
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
          </div>
        ) : (
          <>
            {/* Estatísticas rápidas */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Code2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cards Criados</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.cards}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UsersIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Usuários Cadastrados</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.users}</p>
                </div>
              </div>
            </div>

            {/* Gráfico de linhas */}
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cards"
                    name="Cards Criados"
                    stroke="var(--color-cards)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-cards)', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name="Usuários Cadastrados"
                    stroke="var(--color-users)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-users)', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
