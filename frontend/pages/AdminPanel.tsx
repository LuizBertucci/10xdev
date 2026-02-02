import React, { useEffect, useMemo, useState, useRef } from "react"
import { adminService, type AdminUserRow } from "@/services"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DeleteUserConfirmationDialog from "@/components/DeleteUserConfirmationDialog"
import { toast } from "sonner"
import { Loader2, Users, Trash2 } from "lucide-react"

type SortKey = "name_asc" | "cards_desc" | "cards_asc"

export default function AdminPanel() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AdminUserRow[]>([])
  const [query, setQuery] = useState("")
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
  const [sortKey, setSortKey] = useState<SortKey>("name_asc")
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null)

  const isAdmin = user?.role === "admin"

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!isAdmin) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const res = await adminService.listUsers()
        if (!cancelled) {
          if (res?.success && Array.isArray(res.data)) {
            setItems(res.data)
          } else {
            setItems([])
          }
        }
      } catch (err: any) {
        console.error("Erro ao carregar usuários:", err)
        toast.error(err?.error || "Erro ao carregar usuários")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = !q
      ? items
      : items.filter(u =>
        u.email.toLowerCase().includes(q) ||
        (u.name || "").toLowerCase().includes(q)
      )

    const arr = [...filtered]
    arr.sort((a, b) => {
      if (sortKey === "cards_desc") {
        const diff = (b.cardCount ?? 0) - (a.cardCount ?? 0)
        if (diff !== 0) return diff
      }
      if (sortKey === "cards_asc") {
        const diff = (a.cardCount ?? 0) - (b.cardCount ?? 0)
        if (diff !== 0) return diff
      }

      const aKey = (a.name || a.email || "").toLowerCase()
      const bKey = (b.name || b.email || "").toLowerCase()
      const nameDiff = aKey.localeCompare(bKey, "pt-BR", { sensitivity: "base" })
      if (nameDiff !== 0) return nameDiff
      return a.email.toLowerCase().localeCompare(b.email.toLowerCase(), "pt-BR", { sensitivity: "base" })
    })

    return arr
  }, [items, query, sortKey])

  const handleToggleStatus = async (u: AdminUserRow) => {
    const nextStatus: "active" | "inactive" = u.status === "active" ? "inactive" : "active"

    setUpdating(prev => ({ ...prev, [u.id]: true }))
    try {
      const res = await adminService.setUserStatus(u.id, nextStatus)
      if (res?.success) {
        setItems(prev => prev.map(x => (x.id === u.id ? { ...x, status: nextStatus } : x)))
        toast.success(nextStatus === "active" ? "Usuário reativado" : "Usuário desativado")
      } else {
        toast.error(res?.error || "Falha ao atualizar status")
      }
    } catch (err: any) {
      toast.error(err?.error || "Erro ao atualizar status")
    } finally {
      setUpdating(prev => ({ ...prev, [u.id]: false }))
    }
  }

  const handleChangeRole = async (u: AdminUserRow, nextRole: "admin" | "user") => {
    const currentRole = u.role || "user"
    if (currentRole === nextRole) return

    setUpdating(prev => ({ ...prev, [u.id]: true }))
    try {
      const res = await adminService.setUserRole(u.id, nextRole)
      if (res?.success) {
        setItems(prev => prev.map(x => (x.id === u.id ? { ...x, role: nextRole } : x)))
        if (u.id === user?.id) {
          toast.success("Seu role foi atualizado. Redirecionando...")
          setTimeout(() => {
            window.location.href = "/?tab=codes"
          }, 1500)
        } else {
          toast.success("Role do usuário atualizada")
        }
      } else {
        toast.error(res?.error || "Falha ao atualizar role")
      }
    } catch (err: any) {
      toast.error(err?.error || "Erro ao atualizar role")
    } finally {
      setUpdating(prev => ({ ...prev, [u.id]: false }))
    }
  }

  const handleDeleteUser = async (u: AdminUserRow) => {
    setUpdating(prev => ({ ...prev, [u.id]: true }))
    try {
      const res = await adminService.deleteUser(u.id)
      if (res?.success) {
        setItems(prev => prev.filter(x => x.id !== u.id))
        const anonymizedCards = res.data?.anonymizedCards ?? 0
        const deletedProjects = res.data?.deletedProjects ?? 0
        toast.success(`Usuário excluído. Cards anonimizados: ${anonymizedCards}. Projetos removidos: ${deletedProjects}.`)
      } else {
        toast.error(res?.error || "Falha ao excluir usuário")
      }
    } catch (err: any) {
      toast.error(err?.error || "Erro ao excluir usuário")
    } finally {
      setUpdating(prev => ({ ...prev, [u.id]: false }))
      setDeleteTarget(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Painel de Controle</h2>
            </div>
            <p className="mt-3 text-sm text-gray-600">Acesso restrito a administradores.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      <div className="max-w-5xl mx-auto space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Painel de Controle</h1>
              <p className="text-sm text-gray-600">Usuários da plataforma e estatísticas</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              setLoading(true)
              try {
                const res = await adminService.listUsers()
                if (res?.success && Array.isArray(res.data)) {
                  setItems(res.data)
                  toast.success("Lista atualizada")
                } else {
                  toast.error(res?.error || "Falha ao atualizar")
                }
              } catch (e: any) {
                toast.error(e?.error || "Erro ao atualizar")
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Atualizar
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="max-w-sm"
          />
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Nome (A–Z)</SelectItem>
              <SelectItem value="cards_desc">Cards (maior → menor)</SelectItem>
              <SelectItem value="cards_asc">Cards (menor → maior)</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="whitespace-nowrap">
            {filteredAndSorted.length} usuários
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-600">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
                Carregando usuários...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cards</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSorted.map((u) => {
                    const busy = Boolean(updating[u.id])
                    const status = u.status || "active"
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{u.name || "Sem nome"}</span>
                            <span className="text-xs text-gray-600">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role || "user"}
                            onValueChange={(v) => handleChangeRole(u, v as "admin" | "user")}
                            disabled={busy}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">admin</SelectItem>
                              <SelectItem value="user">user</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Badge variant={status === "active" ? "secondary" : "destructive"}>
                              {status === "active" ? "ativo" : "inativo"}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={status === "active"}
                                onCheckedChange={() => handleToggleStatus(u)}
                                disabled={busy}
                              />
                              <span className="text-xs text-gray-600">
                                {status === "active" ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{u.cardCount ?? 0}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setDeleteTarget(u)}
                            disabled={busy || u.id === user?.id}
                            title={u.id === user?.id ? "Você não pode excluir sua própria conta" : "Excluir usuário"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredAndSorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="p-8 text-center text-gray-600">Nenhum usuário encontrado.</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteUserConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        userNameOrEmail={deleteTarget?.name || deleteTarget?.email || "Usuário"}
        isDeleting={Boolean(deleteTarget?.id && updating[deleteTarget.id])}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          handleDeleteUser(deleteTarget)
        }}
      />
    </div>
  )
}
