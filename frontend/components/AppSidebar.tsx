"use client"

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { Crown, LogOut, PanelLeft, Maximize2, Minimize2, MousePointerClick, Check } from "lucide-react"

type SidebarMode = 'expanded' | 'collapsed' | 'hover'

interface AppSidebarProps {
  platformState: any
}

function AppSidebar({ platformState }: AppSidebarProps) {
  const { user, logout, isProfileLoaded } = useAuth()
  const { setOpenMobile, isMobile, setOpen, open } = useSidebar()
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Sidebar mode: expanded, collapsed, hover (persisted in localStorage)
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('sidebar-mode') as SidebarMode) || 'expanded'
    }
    return 'expanded'
  })

  // Apply mode only when sidebarMode actually changes (not when setOpen identity changes)
  const prevModeRef = useRef<string | null>(null)

  useEffect(() => {
    // Guard: skip if sidebarMode hasn't changed (setOpen identity changes on every open/close)
    if (prevModeRef.current === sidebarMode) return
    prevModeRef.current = sidebarMode

    localStorage.setItem('sidebar-mode', sidebarMode)
    if (isMobile) return
    if (sidebarMode === 'expanded') {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [sidebarMode, setOpen, isMobile])

  // Hover mode: debounced mouse handlers (passed as props to Sidebar's fixed inner div)
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownOpenRef = useRef(false)

  const handleSidebarEnter = React.useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    setOpen(true)
  }, [setOpen])

  const handleSidebarLeave = React.useCallback(() => {
    // Don't collapse while the mode dropdown is open
    if (dropdownOpenRef.current) return
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    leaveTimeoutRef.current = setTimeout(() => setOpen(false), 300)
  }, [setOpen])

  const handleDropdownOpenChange = React.useCallback((isOpen: boolean) => {
    dropdownOpenRef.current = isOpen
    // When dropdown closes and we're in hover mode, schedule collapse
    if (!isOpen && sidebarMode === 'hover' && !isMobile) {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = setTimeout(() => setOpen(false), 400)
    }
  }, [sidebarMode, isMobile, setOpen])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    }
  }, [])

  const handleModeChange = React.useCallback((mode: SidebarMode) => {
    setSidebarMode(mode)
  }, [])
  
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
    <Sidebar
      collapsible="icon"
      ref={sidebarRef}
      onMouseEnter={sidebarMode === 'hover' && !isMobile ? handleSidebarEnter : undefined}
      onMouseLeave={sidebarMode === 'hover' && !isMobile ? handleSidebarLeave : undefined}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
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
            <DropdownMenu onOpenChange={handleDropdownOpenChange}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="text-muted-foreground hover:text-foreground">
                  <PanelLeft className="size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleModeChange('expanded')}>
                  <Maximize2 className="size-4 mr-2" />
                  Expandido
                  {sidebarMode === 'expanded' && <Check className="size-4 ml-auto text-blue-600" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleModeChange('collapsed')}>
                  <Minimize2 className="size-4 mr-2" />
                  Recolhido
                  {sidebarMode === 'collapsed' && <Check className="size-4 ml-auto text-blue-600" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleModeChange('hover')}>
                  <MousePointerClick className="size-4 mr-2" />
                  Expandir ao passar
                  {sidebarMode === 'hover' && <Check className="size-4 ml-auto text-blue-600" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
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
      {sidebarMode === 'hover' && <SidebarRail />}
    </Sidebar>
  )
}

// Memoiza o componente para evitar re-renders desnecessários quando o pai re-renderiza
export default React.memo(AppSidebar, (prevProps, nextProps) => {
  // Only re-render if platformState.activeTab changes
  const prevActiveTab = prevProps.platformState?.activeTab
  const nextActiveTab = nextProps.platformState?.activeTab
  if (prevActiveTab !== nextActiveTab) return false
  return true
})
