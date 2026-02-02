"use client"

import React, { useMemo } from 'react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { Crown, LogOut } from "lucide-react"

interface AppSidebarProps {
  platformState: any
}

function AppSidebar({ platformState }: AppSidebarProps) {
  const { user, logout, isProfileLoaded } = useAuth()
  const { setOpenMobile, isMobile } = useSidebar()
  
  // Memoiza o cálculo de isAdmin para evitar re-computação
  const isAdmin = useMemo(() => user?.role === 'admin', [user?.role])

  // Memoiza navItems - só recalcula quando isAdmin muda
  const navItems = useMemo(() => [
    { key: "home", title: "Início", icon: "🏠", tooltip: "Início" },
    { key: "codes", title: "Códigos", icon: "💻", tooltip: "Códigos" },
    { key: "contents", title: "Conteúdos", icon: "🎓", tooltip: "Conteúdos" },
    { key: "projects", title: "Projetos", icon: "📁", tooltip: "Projetos" },
    ...(isAdmin ? [{ key: "admin", title: "Painel de Controle", icon: "🛠️", tooltip: "Painel de Controle" }] : [])
  ], [isAdmin])

  const handleNavClick = React.useCallback((key: string) => {
    platformState.setActiveTab(key)
    // Fecha a sidebar no mobile após clicar
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [platformState, isMobile, setOpenMobile])

  const handleLogout = React.useCallback(async () => {
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
  }, [logout])

  // Memoiza as iniciais do usuário
  const userInitials = useMemo(() => {
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
  }, [user?.name, user?.email])

  // Memoiza as informações do usuário para evitar re-render desnecessária
  const userDisplayName = useMemo(() => user?.name || 'Usuário', [user?.name])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex w-9 shrink-0 items-center justify-start rounded-md bg-slate-400 px-1 py-0.5">
                <img
                  src="/brand/10xdev-logo-sem-fundo.png"
                  alt="10xDev"
                  className="h-5 w-auto max-w-full object-contain object-left"
                />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
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
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 text-left text-sm" key={user?.id || 'no-user'}>
                <span className="truncate font-medium flex items-center gap-1">
                  {userDisplayName}
                  {isAdmin && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
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
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

// Memoiza o componente para evitar re-renders desnecessários quando o pai re-renderiza
export default React.memo(AppSidebar)
