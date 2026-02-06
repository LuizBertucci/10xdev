"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Check, Link2, User as UserIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sharing } from "@/components/Sharing"
import { projectService } from "@/services"
import { type User } from "@/services/userService"
import { toast } from "sonner"

interface ProjectMember {
  id: string
  userId: string
  user?: {
    id: string
    email: string
    name?: string | null
    avatarUrl?: string | null
  }
}

interface AddMemberInProjectProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  members: ProjectMember[]
  onMembersAdded: () => void
}

export function AddMemberInProject({
  open,
  onOpenChange,
  projectId,
  members,
  onMembersAdded,
}: AddMemberInProjectProps) {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [linkCopied, setLinkCopied] = useState(false)

  const shareableUrl = useMemo(() => {
    if (typeof window === 'undefined' || !projectId) return ''
    return `${window.location.origin}/?tab=projects&id=${projectId}`
  }, [projectId])

  const handleCopyUrl = async () => {
    if (!shareableUrl) return
    try {
      await navigator.clipboard.writeText(shareableUrl)
      setLinkCopied(true)
      toast.success('Link do projeto copiado!')
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      toast.error('Erro ao copiar link do projeto')
    }
  }

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0 || !projectId) return

    try {
      let successCount = 0
      const errors: string[] = []

      for (const user of selectedUsers) {
        const response = await projectService.addMember(projectId, { userId: user.id })
        if (response?.success) {
          successCount++
        } else {
          errors.push(response?.error || `Falha ao adicionar ${user.name || user.email}`)
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} membro(s) adicionado(s) com sucesso`)
        onMembersAdded()
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} erro(s): ${errors[0]}`)
      }

      onOpenChange(false)
      setSelectedUsers([])
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar membros')
    }
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setSelectedUsers([])
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Membros</DialogTitle>
          <DialogDescription>
            Busque por nome ou email para adicionar ao projeto.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {shareableUrl && (
            <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-200 ${
              linkCopied
                ? 'bg-green-50 border-green-200'
                : 'bg-blue-50/60 border-blue-100'
            }`}>
              <div className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${
                linkCopied ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {linkCopied
                  ? <Check className="h-3.5 w-3.5 text-green-600" />
                  : <Link2 className="h-3.5 w-3.5 text-blue-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-medium ${linkCopied ? 'text-green-700' : 'text-blue-700'}`}>
                  {linkCopied ? 'Link copiado!' : 'Compartilhar via link'}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{shareableUrl}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyUrl}
                className={`h-7 px-3 text-[11px] font-medium shrink-0 rounded-md transition-all ${
                  linkCopied
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-white hover:bg-blue-100 text-blue-600 border border-blue-200 shadow-sm'
                }`}
              >
                {linkCopied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          )}
          <Sharing
            selectedUsers={selectedUsers}
            onChange={setSelectedUsers}
            placeholder="Busque por nome ou email..."
            existingUserIds={members.map((m) => m.userId)}
          />
          {members.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">Membros atuais ({members.length})</p>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md border border-gray-200 text-xs text-gray-600">
                    {m.user?.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt={m.user.name || m.user.email} className="w-5 h-5 rounded-full flex-shrink-0" />
                    ) : (
                      <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="font-medium truncate">{m.user?.name || 'Sem nome'}</span>
                    <span className="text-gray-400 truncate ml-auto">{m.user?.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAddMembers} disabled={selectedUsers.length === 0}>
            Adicionar {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
