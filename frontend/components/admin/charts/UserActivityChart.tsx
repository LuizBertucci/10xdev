'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import type { SystemStats } from '@/types/admin'

interface UserActivityChartProps {
  stats: SystemStats | null
}

export function UserActivityChart({ stats }: UserActivityChartProps) {
  const chartData = useMemo(() => {
    if (!stats) return []

    return [
      {
        period: 'Esta Semana',
        users: stats.usersThisWeek || 0,
        cards: stats.cardsThisWeek || 0
      },
      {
        period: 'Este Mês',
        users: stats.usersThisMonth || 0,
        cards: stats.cardsThisMonth || 0
      }
    ]
  }, [stats])

  const config = {
    users: {
      label: 'Novos Usuários',
      color: 'hsl(var(--chart-1))'
    },
    cards: {
      label: 'Cards Criados',
      color: 'hsl(var(--chart-2))'
    }
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Novos usuários e cards criados</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Carregando dados...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
        <CardDescription>Novos usuários e cards criados</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar
                dataKey="users"
                fill="var(--color-users)"
                radius={[4, 4, 0, 0]}
                name="Novos Usuários"
              />
              <Bar
                dataKey="cards"
                fill="var(--color-cards)"
                radius={[4, 4, 0, 0]}
                name="Cards Criados"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
