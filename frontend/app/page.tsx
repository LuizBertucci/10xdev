"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Zap, 
  Code2, 
  Play, 
  FolderOpen, 
  Search, 
  Heart, 
  Star, 
  Clock, 
  Download, 
  GitBranch, 
  Filter, 
  Users, 
  Bot, 
  Workflow, 
  Server, 
  FileCode, 
  Lightbulb, 
  Sparkles, 
  ChevronRight, 
  Trophy, 
  Maximize2, 
  X 
} from "lucide-react"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { usePlatform } from "@/hooks/use-platform"
import AppSidebar from "@/components/AppSidebar"
import Home from "@/pages/Home"
import Codes from "@/pages/Codes"
import Lessons from "@/pages/Lessons"
import Projects from "@/pages/Projects"
import AI from "@/pages/AI"
import Dashboard from "@/pages/Dashboard"
import { codeSnippets } from "@/mockData/codes"

export default function DevPlatform() {
  const platformState = usePlatform()
  const [currentScreens, setCurrentScreens] = useState<Record<string, number>>({})
  const [openModalId, setOpenModalId] = useState<string | null>(null)

  const quickAccessBlocks = [
    { title: "React Hooks", icon: Code2, color: "bg-blue-500", count: "150+ snippets" },
    { title: "Node.js APIs", icon: Code2, color: "bg-green-500", count: "80+ exemplos" },
    { title: "Python Scripts", icon: Code2, color: "bg-yellow-500", count: "200+ códigos" },
    { title: "CSS Animations", icon: Code2, color: "bg-purple-500", count: "60+ efeitos" },
  ]

  const featuredVideos = [
    { title: "React do Zero ao Avançado", duration: "12h", progress: 65, instructor: "João Silva" },
    { title: "Node.js e Express", duration: "8h", progress: 30, instructor: "Maria Santos" },
    { title: "Python para Data Science", duration: "15h", progress: 0, instructor: "Carlos Lima" },
  ]

  const featuredProjects = [
    {
      title: "E-commerce Completo",
      tech: ["React", "Node.js", "MongoDB"],
      difficulty: "Avançado",
      stars: 1250,
      description: "Sistema completo de e-commerce com carrinho, pagamentos e admin",
    },
    {
      title: "Dashboard Analytics",
      tech: ["Vue.js", "Chart.js", "Firebase"],
      difficulty: "Intermediário",
      stars: 890,
      description: "Dashboard responsivo com gráficos e métricas em tempo real",
    },
    {
      title: "API REST com Auth",
      tech: ["Express", "JWT", "PostgreSQL"],
      difficulty: "Intermediário",
      stars: 650,
      description: "API completa com autenticação, validação e documentação",
    },
  ]

  const videoLessons = [
    {
      id: "1",
      title: "Introdução ao React",
      description: "Conceitos básicos e setup do ambiente",
      duration: "30min",
      chapter: 1,
      completed: true,
      track: "React Fundamentals",
    },
    {
      id: "2",
      title: "Componentes e Props",
      description: "Aprenda a criar componentes reutilizáveis",
      duration: "45min",
      chapter: 2,
      completed: true,
      track: "React Fundamentals",
    },
    {
      id: "3",
      title: "Estado e Eventos",
      description: "Gerenciamento de estado e manipulação de eventos",
      duration: "60min",
      chapter: 3,
      completed: false,
      track: "React Fundamentals",
    },
    {
      id: "4",
      title: "Hooks em React",
      description: "Aprenda a usar hooks para gerenciar o estado e o ciclo de vida",
      duration: "75min",
      chapter: 1,
      completed: false,
      track: "React Avançado",
    },
    {
      id: "5",
      title: "Context API",
      description: "Compartilhamento de estado entre componentes",
      duration: "90min",
      chapter: 2,
      completed: false,
      track: "React Avançado",
    },
  ]

  const projectTemplates = [
    {
      id: "1",
      title: "E-commerce React",
      description: "Template completo de e-commerce com React e Firebase",
      tech: ["React", "Firebase", "Stripe"],
      difficulty: "Avançado",
      stars: 1250,
      downloads: "5.2k",
      requirements: ["Node.js v16+", "Firebase Account", "Stripe Account"],
    },
    {
      id: "2",
      title: "Dashboard Admin Vue",
      description: "Template de dashboard administrativo com Vue.js e Tailwind CSS",
      tech: ["Vue.js", "Tailwind CSS", "Chart.js"],
      difficulty: "Intermediário",
      stars: 890,
      downloads: "3.8k",
      requirements: ["Node.js v16+", "Vue CLI"],
    },
    {
      id: "3",
      title: "API REST Node.js",
      description: "Template de API REST com Node.js, Express e MongoDB",
      tech: ["Node.js", "Express", "MongoDB"],
      difficulty: "Intermediário",
      stars: 650,
      downloads: "2.5k",
      requirements: ["Node.js v16+", "MongoDB Atlas Account"],
    },
  ]

  return (
    <SidebarProvider>
<AppSidebar platformState={platformState} />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger />
                  <div className="flex items-center space-x-2">
                    <Zap className="h-8 w-8 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">10xDev</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Todo o conteúdo das abas permanece exatamente igual */}
            {platformState.activeTab === "home" && <Home platformState={platformState} />}

            {platformState.activeTab === "codes" && <Codes platformState={platformState} />}

            {platformState.activeTab === "lessons" && <Lessons />}

            {platformState.activeTab === "projects" && <Projects />}
            {/* AI Integration Tab */}
            {platformState.activeTab === "ai" && <AI />}

            {platformState.activeTab === "dashboard" && <Dashboard platformState={platformState} />}
          </main>
        </div>
      </SidebarInset>
      {/* Code Expansion Modal */}
      {openModalId &&
        codeSnippets.map((snippet) => {
          if (snippet.id === openModalId) {
            return (
              <div
                key={`modal-${snippet.id}`}
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              >
                <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div>
                      <h3 className="text-xl font-semibold">{snippet.title}</h3>
                      <p className="text-gray-600">{snippet.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenModalId(null)}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-x-auto p-4">
                    <div className="flex gap-4 pb-4">
                      {snippet.screens.map((screen, index) => (
                        <div key={index} className="flex flex-col h-full min-w-[400px] max-w-[500px]">
                          <div className="mb-2">
                            <h4 className="font-medium">{screen.name}</h4>
                            <p className="text-sm text-gray-600">{screen.description}</p>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-4 overflow-auto flex-1">
                            <pre className="text-sm text-gray-100 h-full">
                              <code>{screen.code}</code>
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t p-4 flex justify-between items-center">
                    <Badge variant="secondary">{snippet.language}</Badge>
                    <Button onClick={() => setOpenModalId(null)}>Fechar</Button>
                  </div>
                </div>
              </div>
            )
          }
          return null
        })}
    </SidebarProvider>
  )
}
