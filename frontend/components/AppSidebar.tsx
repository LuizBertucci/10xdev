"use client"

import {
  Code2,
  Play,
  FolderOpen,
  Heart,
  BookOpen,
  Zap,
  Brain,
  Star,
  BarChart3,
  User,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "./AuthContext"

interface AppSidebarProps {
  platformState: any
}

export default function AppSidebar({ platformState }: AppSidebarProps) {
  const { isAuthenticated } = useAuth()

  const baseMenuItems = [
    {
      title: "Início",
      icon: Zap,
      key: "home",
      description: "Dashboard principal",
    },
    {
      title: "Códigos",
      icon: Code2,
      key: "codes",
      description: "Snippets e exemplos",
    },
    {
      title: "Aulas",
      icon: Play,
      key: "lessons",
      description: "Videoaulas e trilhas",
    },
    {
      title: "Projetos",
      icon: FolderOpen,
      key: "projects",
      description: "Templates completos",
    },
    {
      title: "IA",
      icon: Brain,
      key: "ai",
      description: "Integração com IA",
    },
    {
      title: "Dashboard",
      icon: BarChart3,
      key: "dashboard",
      description: "Analytics e métricas",
    },
  ]

  const authMenuItems = [
    {
      title: "Perfil",
      icon: User,
      key: "profile",
      description: "Perfil do usuário",
    },
  ]

  const menuItems = isAuthenticated ? [...baseMenuItems, ...authMenuItems] : baseMenuItems


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
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => platformState.setActiveTab(item.key)}
                    isActive={platformState.activeTab === item.key}
                    tooltip={item.title}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        <SidebarGroup>
          <SidebarGroupLabel>Favoritos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Heart className="size-4" />
                  <span>Meus Snippets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <BookOpen className="size-4" />
                  <span>Aulas Salvas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Star className="size-4" />
                  <span>Projetos Favoritos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                <AvatarFallback>DV</AvatarFallback>
              </Avatar>
              <span>Developer</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}