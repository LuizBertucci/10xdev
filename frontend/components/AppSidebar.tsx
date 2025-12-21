"use client"

import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { LogOut, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"

interface AppSidebarProps {
  platformState: any
}

const navItems = [
  { key: "home", title: "Início", icon: "🏠", tooltip: "Início" },
  { key: "codes", title: "Códigos", icon: "💻", tooltip: "Códigos" },
  { key: "videos", title: "Vídeos", icon: "🎓", tooltip: "Vídeos" },
  { key: "projects", title: "Projetos", icon: "📁", tooltip: "Projetos" },
]

export default function AppSidebar({ platformState }: AppSidebarProps) {
  const { user, logout } = useAuth()
  const { setOpenMobile, isMobile } = useSidebar()
  const router = useRouter()

  const isAdmin = user?.role === 'admin'

  const handleNavClick = (key: string) => {
    platformState.setActiveTab(key)
    // Fecha a sidebar no mobile após clicar
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleAdminClick = () => {
    router.push('/admin')
    // Fecha a sidebar no mobile após clicar
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      // Aguardar um pouco para garantir que o estado foi atualizado
      // e então forçar redirecionamento
      setTimeout(() => {
        // Usar window.location para garantir redirecionamento mesmo se o router falhar
        window.location.href = '/login'
      }, 200)
    } catch (error: any) {
      console.error('Erro no logout:', error)
      toast.error('Erro ao fazer logout')
    }
  }

  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'DV'
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-sidebar-primary-foreground">
                <span className="text-lg">⚡</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">10xDev</span>
                <span className="truncate text-xs">Plataforma Dev</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-y-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => handleNavClick(item.key)}
                    isActive={platformState.activeTab === item.key}
                    tooltip={item.tooltip}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Painel de Controle - Apenas para administradores */}
              {isAdmin && (
                <>
                  <Separator className="my-2" />
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleAdminClick}
                      tooltip="Painel de Controle"
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <span className="text-base">🛡️</span>
                      <span className="font-medium">Painel de Controle</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Avatar className="size-6">
                <AvatarImage src={user?.avatarUrl || ""} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 text-left text-sm">
                <span className="truncate font-medium">{user?.name || 'Usuário'}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="size-5 text-red-500" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
