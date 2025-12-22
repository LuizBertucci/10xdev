import React from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, X } from 'lucide-react'
import type { UserRole, UserStatus } from '@/types/admin'

interface UserFiltersProps {
  searchTerm: string
  roleFilter: UserRole | 'all'
  statusFilter: UserStatus | 'all'
  onSearchChange: (term: string) => void
  onRoleFilterChange: (role: UserRole | 'all') => void
  onStatusFilterChange: (status: UserStatus | 'all') => void
  totalUsers: number
  filteredCount: number
}

export function UserFilters({
  searchTerm,
  roleFilter,
  statusFilter,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  totalUsers,
  filteredCount
}: UserFiltersProps) {
  const hasActiveFilters = searchTerm !== '' || roleFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    onSearchChange('')
    onRoleFilterChange('all')
    onStatusFilterChange('all')
  }

  return (
    <div className="space-y-4">
      {/* Search and filters row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role filter */}
        <Select value={roleFilter} onValueChange={(value) => onRoleFilterChange(value as UserRole | 'all')}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Filtrar por role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os roles</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
            <SelectItem value="consultor">Consultor</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as UserStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="icon"
            onClick={clearFilters}
            className="shrink-0"
            title="Limpar filtros"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Results count and active filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Mostrando <span className="font-semibold text-foreground">{filteredCount}</span> de{' '}
          <span className="font-semibold text-foreground">{totalUsers}</span> usuários
        </span>

        {hasActiveFilters && (
          <>
            <span className="text-sm text-muted-foreground">•</span>
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  <Search className="h-3 w-3" />
                  {searchTerm}
                </Badge>
              )}
              {roleFilter !== 'all' && (
                <Badge variant="secondary">
                  Role: {roleFilter === 'admin' ? 'Administrador' : roleFilter === 'user' ? 'Usuário' : 'Consultor'}
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary">
                  Status: {statusFilter === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
