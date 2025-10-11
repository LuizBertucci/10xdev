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
  GraduationCap,
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

interface AppSidebarProps {
  platformState: any
}

export default function AppSidebar({ platformState }: AppSidebarProps) {
  const menuItems = [
    {
      title: "Início",
      icon: Zap,
      key: "home",
      description: "Dashboard principal",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Códigos",
      icon: Code2,
      key: "codes",
      description: "Snippets e exemplos",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Aulas",
      icon: Play,
      key: "lessons",
      description: "Videoaulas e trilhas",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Treinamentos",
      icon: GraduationCap,
      key: "trainings",
      description: "Cursos e certificações",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Projetos",
      icon: FolderOpen,
      key: "projects",
      description: "Templates completos",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "IA",
      icon: Brain,
      key: "ai",
      description: "Integração com IA",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      title: "Dashboard",
      icon: BarChart3,
      key: "dashboard",
      description: "Analytics e métricas",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
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
                    <div className={`flex items-center justify-center rounded-lg p-1.5 ${item.bgColor}`}>
                      <item.icon className={`size-4 ${item.color}`} />
                    </div>
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
                  <div className="flex items-center justify-center rounded-lg p-1.5 bg-red-500/10">
                    <Heart className="size-4 text-red-500" />
                  </div>
                  <span>Meus Snippets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <div className="flex items-center justify-center rounded-lg p-1.5 bg-indigo-500/10">
                    <BookOpen className="size-4 text-indigo-500" />
                  </div>
                  <span>Aulas Salvas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <div className="flex items-center justify-center rounded-lg p-1.5 bg-amber-500/10">
                    <Star className="size-4 text-amber-500" />
                  </div>
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