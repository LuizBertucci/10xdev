import { useEffect, useMemo, useState } from "react"
import { adminService, type AdminUserRow } from "@/services"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Users } from "lucide-react"

export default function AdminPanel() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AdminUserRow[]>([])
  const [query, setQuery] = useState("")
  const [updating, setUpdating] = useState<Record<string, boolean>>({})

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.name || "").toLowerCase().includes(q)
    )
  }, [items, query])

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
          <Badge variant="secondary" className="whitespace-nowrap">
            {filtered.length} usuários
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
                  {filtered.map((u) => {
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
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                            {u.role || "user"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status === "active" ? "secondary" : "destructive"}>
                            {status === "active" ? "ativo" : "inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{u.cardCount ?? 0}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
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
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && (
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
    </div>
  )
}


