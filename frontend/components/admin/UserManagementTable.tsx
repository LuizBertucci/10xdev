import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  Eye
} from 'lucide-react'
import type {
  UserWithStats,
  UserRole,
  UserStatus,
  ROLE_LABELS,
  ROLE_COLORS,
  STATUS_LABELS,
  STATUS_COLORS
} from '@/types/admin'
import { cn } from '@/lib/utils'

interface UserManagementTableProps {
  users: UserWithStats[]
  currentUserId?: string
  onUpdateRole: (userId: string, role: UserRole) => Promise<void>
  onUpdateStatus: (userId: string, status: UserStatus) => Promise<void>
  onDeleteUser: (userId: string) => Promise<void>
  onViewDetails?: (userId: string) => void
  loading?: boolean
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  user: 'Usuário',
  consultor: 'Consultor'
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  user: 'bg-blue-100 text-blue-800 border-blue-200',
  consultor: 'bg-purple-100 text-purple-800 border-purple-200'
}

const statusLabels: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo'
}

const statusColors: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200'
}

export function UserManagementTable({
  users,
  currentUserId,
  onUpdateRole,
  onUpdateStatus,
  onDeleteUser,
  onViewDetails,
  loading = false
}: UserManagementTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserWithStats | null>(null)
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null)

  const handleDeleteClick = (user: UserWithStats) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      await onDeleteUser(userToDelete.id)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    await onUpdateRole(userId, newRole)
    setEditingRoleUserId(null)
  }

  const handleToggleStatus = async (user: UserWithStats) => {
    const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active'
    await onUpdateStatus(user.id, newStatus)
  }

  const isCurrentUser = (userId: string) => userId === currentUserId

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="w-full p-8 text-center text-muted-foreground">
        Carregando usuários...
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="w-full p-8 text-center text-muted-foreground">
        Nenhum usuário encontrado
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Usuário</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cards</TableHead>
              <TableHead className="text-right">Projetos</TableHead>
              <TableHead className="text-right">Participações</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                {/* Usuário (Avatar + Nome + Email) */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.name || 'Sem nome'}
                        {isCurrentUser(user.id) && (
                          <span className="ml-2 text-xs text-muted-foreground">(Você)</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Role (editable select) */}
                <TableCell>
                  {editingRoleUserId === user.id ? (
                    <Select
                      defaultValue={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="consultor">Consultor</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn('cursor-pointer', roleColors[user.role])}
                      onClick={() => !isCurrentUser(user.id) && setEditingRoleUserId(user.id)}
                    >
                      {roleLabels[user.role]}
                    </Badge>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant="outline" className={statusColors[user.status]}>
                    {statusLabels[user.status]}
                  </Badge>
                </TableCell>

                {/* Estatísticas */}
                <TableCell className="text-right tabular-nums">
                  {user.cardsCreated}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {user.projectsCreated}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {user.projectsParticipating}
                </TableCell>

                {/* Ações */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {/* Ver detalhes */}
                      {onViewDetails && (
                        <DropdownMenuItem onClick={() => onViewDetails(user.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                      )}

                      {/* Editar role */}
                      <DropdownMenuItem
                        onClick={() => setEditingRoleUserId(user.id)}
                        disabled={isCurrentUser(user.id)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar role
                      </DropdownMenuItem>

                      {/* Toggle status */}
                      <DropdownMenuItem
                        onClick={() => handleToggleStatus(user)}
                        disabled={isCurrentUser(user.id)}
                      >
                        {user.status === 'active' ? (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* Deletar */}
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(user)}
                        disabled={isCurrentUser(user.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deletar usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário{' '}
              <span className="font-semibold">{userToDelete?.email}</span> será
              permanentemente removido do sistema, incluindo todos os seus dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
