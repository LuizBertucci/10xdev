'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import type { SystemStats } from '@/types/admin'

interface RoleDistributionChartProps {
  stats: SystemStats | null
}

export function RoleDistributionChart({ stats }: RoleDistributionChartProps) {
  const chartData = useMemo(() => {
    if (!stats) return []

    return [
      {
        name: 'Administradores',
        value: stats.adminUsers || 0,
        fill: '#ef4444' // Red - mesma cor do badge admin
      },
      {
        name: 'Usuários',
        value: (stats.totalUsers || 0) - (stats.adminUsers || 0),
        fill: '#3b82f6' // Blue - mesma cor do badge user
      }
    ]
  }, [stats])

  const config = {
    admin: {
      label: 'Administradores',
      color: '#ef4444'
    },
    user: {
      label: 'Usuários',
      color: '#3b82f6'
    }
  }

  if (!stats || chartData.length === 0 || chartData.every(d => d.value === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Role</CardTitle>
          <CardDescription>Proporção de administradores e usuários</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Sem dados disponíveis</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Role</CardTitle>
        <CardDescription>Proporção de administradores e usuários</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
