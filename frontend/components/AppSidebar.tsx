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
import { useRouter } from "next/navigation"

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
  const router = useRouter()
  const menuItems = [
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
      title: "Treinamentos",
      icon: GraduationCap,
      key: "trainings",
      description: "Cursos e certificações",
    },
    {
      title: "Projetos",
      icon: FolderOpen,
      key: "projects",
      description: "Templates completos",
    },
    {
      title: "Dashboard",
      icon: BarChart3,
      key: "dashboard",
      description: "Analytics e métricas",
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

      <SidebarContent className="overflow-y-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => platformState.setActiveTab("home")}
                isActive={platformState.activeTab === "home"}
                tooltip="Início"
              >
                <Zap className="size-4 text-yellow-500" />
                <span>Início</span>
              </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Códigos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => platformState.setActiveTab("codes")}
                isActive={platformState.activeTab === "codes"}
                tooltip="Códigos"
              >
                <Code2 className="size-4 text-green-500" />
                <span>Códigos</span>
              </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => platformState.setActiveTab("projects")}
                  isActive={platformState.activeTab === "projects"}
                  tooltip="Projetos"
                >
                  <FolderOpen className="size-4 text-purple-500" />
                  <span>Projetos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conteúdos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => platformState.setActiveTab("videos")}
                  isActive={platformState.activeTab === "videos"}
                  tooltip="Videos"
                >
                  <GraduationCap className="size-4 text-blue-500" />
                  <span>Videos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => platformState.setActiveTab("lessons")}
                  isActive={platformState.activeTab === "lessons"}
                  tooltip="Aulas"
                >
                  <Play className="size-4 text-red-500" />
                  <span>Aulas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => platformState.setActiveTab("trainings")}
                  isActive={platformState.activeTab === "trainings"}
                  tooltip="Treinamentos"
                >
                  <BookOpen className="size-4 text-orange-500" />
                  <span>Treinamentos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => platformState.setActiveTab("dashboard")}
                  isActive={platformState.activeTab === "dashboard"}
                  tooltip="Dashboard"
                >
                  <BarChart3 className="size-4 text-indigo-500" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Favoritos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Meus Snippets">
                  <Heart className="size-4 text-red-400" />
                  <span>Meus Snippets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Aulas Salvas">
                  <BookOpen className="size-4 text-emerald-500" />
                  <span>Aulas Salvas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Projetos Favoritos">
                  <Star className="size-4 text-yellow-400" />
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