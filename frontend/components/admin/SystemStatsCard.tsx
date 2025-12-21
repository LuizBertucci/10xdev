import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SystemStatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label: string
  }
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
}

const colorClasses = {
  blue: 'bg-blue-500/10 text-blue-600',
  green: 'bg-green-500/10 text-green-600',
  orange: 'bg-orange-500/10 text-orange-600',
  red: 'bg-red-500/10 text-red-600',
  purple: 'bg-purple-500/10 text-purple-600'
}

const trendColorClasses = {
  up: 'text-green-600',
  down: 'text-red-600',
  neutral: 'text-gray-600'
}

export function SystemStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue'
}: SystemStatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-md', colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2 text-xs">
            <span className={cn('font-medium', trendColorClasses[trend.direction])}>
              {trend.direction === 'up' && '+'}
              {trend.direction === 'down' && '-'}
              {trend.value}
            </span>
            <span className="text-muted-foreground ml-1">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
