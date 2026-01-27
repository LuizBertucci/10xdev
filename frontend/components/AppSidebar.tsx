"use client"

import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { Crown, LogOut, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

interface AppSidebarProps {
  platformState: any
}

export default function AppSidebar({ platformState }: AppSidebarProps) {
  const { user, logout } = useAuth()
  const { setOpenMobile, isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const isAdmin = user?.role === 'admin'

  const navItems = [
    { key: "home", title: "Início", icon: "🏠", tooltip: "Início" },
    { key: "codes", title: "Códigos", icon: "💻", tooltip: "Códigos" },
    { key: "contents", title: "Conteúdos", icon: "🎓", tooltip: "Conteúdos" },
    { key: "projects", title: "Projetos", icon: "📁", tooltip: "Projetos" },
    ...(isAdmin ? [{ key: "admin", title: "Painel de Controle", icon: "🛠️", tooltip: "Painel de Controle" }] : [])
  ]

  const handleNavClick = (key: string) => {
    platformState.setActiveTab(key)
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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
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
              <div className="flex aspect-square size-8 items-center justify-center">
                <img
                  src="/brand/Logo 10xDev Sem fundo.png"
                  alt="10xDev"
                  className="h-7 w-auto"
                />
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
                <span className="truncate font-medium flex items-center gap-1">
                  {user?.name || 'Usuário'}
                  {isAdmin ? <Crown className="h-3.5 w-3.5 text-amber-500" /> : null}
                </span>
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
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme}>
              {theme === 'dark' ? (
                <>
                  <Sun className="size-5" />
                  <span>Modo claro</span>
                </>
              ) : (
                <>
                  <Moon className="size-5" />
                  <span>Modo escuro</span>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
