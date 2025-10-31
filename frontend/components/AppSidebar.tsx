"use client"

import {
  Code2,
  Play,
  Zap,
  LogOut,
  Home,
  BookOpenCheck,
  FolderKanban,
  Sparkles,
  LayoutDashboard,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface AppSidebarProps {
  platformState: any
}

export default function AppSidebar({ platformState }: AppSidebarProps) {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()

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
  const menuItems = [
    {
      title: "Início",
      icon: Home,
      key: "home",
      description: "Dashboard principal",
      iconColor: "text-blue-500",
    },
    {
      title: "Códigos",
      icon: Code2,
      key: "codes",
      description: "Snippets e exemplos",
      iconColor: "text-purple-500",
    },
    {
      title: "Aulas",
      icon: Play,
      key: "lessons",
      description: "Videoaulas e trilhas",
      iconColor: "text-green-500",
    },
    {
      title: "Treinamentos",
      icon: BookOpenCheck,
      key: "trainings",
      description: "Cursos e certificações",
      iconColor: "text-orange-500",
    },
    {
      title: "Projetos",
      icon: FolderKanban,
      key: "projects",
      description: "Templates completos",
      iconColor: "text-indigo-500",
    },
    {
      title: "IA",
      icon: Sparkles,
      key: "ai",
      description: "Integração com IA",
      iconColor: "text-pink-500",
    },
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      key: "dashboard",
      description: "Analytics e métricas",
      iconColor: "text-cyan-500",
    },
  ]


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
                <Zap className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">10xDev</span>
                <span className="truncate text-xs">Plataforma Dev</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => platformState.setActiveTab(item.key)}
                    isActive={platformState.activeTab === item.key}
                    tooltip={item.title}
                  >
                    <item.icon className={`size-5 ${item.iconColor || ''}`} />
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
                <AvatarImage src="/placeholder.svg?height=24&width=24" />
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