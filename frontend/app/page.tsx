"use client"


import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePlatform } from "@/hooks/use-platform"
import { useSearchParams } from "next/navigation"
import AppSidebar from "@/components/AppSidebar"
import Home from "@/pages/Home"
import Codes from "@/pages/Codes"
import CodeDetail from "@/pages/CodeDetail"
import ProtectedRoute from "@/components/ProtectedRoute"
import Contents from "@/pages/Contents"
import ContentDetail from "@/pages/ContentDetail"
import TutorialDetail from "@/pages/TutorialDetail"
import Projects from "@/pages/Projects"
import ProjectDetail from "@/pages/ProjectDetail"
import AdminPanel from "@/pages/AdminPanel"
import { useAuth } from "@/hooks/useAuth"
import { useEffect, useState, useMemo } from "react"
import PublicHome from "@/components/PublicHome"

export default function DevPlatform() {
  const searchParams = useSearchParams()
  const tab = searchParams?.get('tab')

  // Hooks must be called before any early returns
  const platformState = usePlatform()
  const { user, isProfileLoaded } = useAuth()
  const activeTab = platformState.activeTab
  const contentsTab = searchParams?.get('contentsTab') || 'posts'
  const contentId = activeTab === "contents" ? searchParams?.get('id') || null : null
  const projectId = activeTab === "projects" ? searchParams?.get('id') || null : null
  const codeId = activeTab === "codes" ? searchParams?.get('id') || null : null

  // Memoiza isAdmin para evitar re-renders quando user muda mas role não
  const isAdmin = useMemo(() => user?.role === 'admin', [user?.role])

  // Abas já visitadas: mantém montadas e só oculta com CSS, evitando piscar ao trocar de aba
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]))
  useEffect(() => {
    setVisitedTabs(prev => new Set(prev).add(activeTab))
  }, [activeTab])

  // Hard-guard: se usuário não é admin, não deixa permanecer na tab admin
  useEffect(() => {
    // Importante: só aplicar o redirect depois que tentamos carregar o perfil (role/status).
    if (platformState.activeTab === "admin" && isProfileLoaded && user?.role !== "admin") {
      platformState.setActiveTab("home")
    }
  }, [platformState, user?.role, isProfileLoaded])

  // Landing pública (somente `/` sem `tab`) - return after hooks are initialized
  if (!tab) {
    return <PublicHome />
  }

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar platformState={platformState} />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center space-x-4">
                    <SidebarTrigger />
                    <div className="flex items-center justify-center rounded-lg bg-slate-400 px-2 py-1.5">
                      <img
                        src="/brand/10xdev-logo-sem-fundo.png"
                        alt="10xDev"
                        className="h-8 w-auto"
                      />
                      <span className="sr-only">10xDev</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
              {/* Só monta abas já visitadas; ocultar com CSS evita piscar ao trocar (sidebar, botões, painel). */}
              {visitedTabs.has("home") && (
                <div className={platformState.activeTab === "home" ? "block" : "hidden"}>
                  <Home platformState={platformState} />
                </div>
              )}

              {visitedTabs.has("codes") && (
                <div className={platformState.activeTab === "codes" ? "block" : "hidden"}>
                  {codeId ? (
                    <CodeDetail platformState={platformState} />
                  ) : (
                    <Codes platformState={platformState} />
                  )}
                </div>
              )}

              {visitedTabs.has("contents") && (
                <div className={platformState.activeTab === "contents" ? "block" : "hidden"}>
                  {contentId && contentsTab === "tutorials" ? (
                    <TutorialDetail platformState={platformState} />
                  ) : contentId && contentsTab !== "tutorials" ? (
                    <ContentDetail platformState={platformState} />
                  ) : (
                    <Contents platformState={platformState} />
                  )}
                </div>
              )}

              {visitedTabs.has("projects") && (
                <div className={platformState.activeTab === "projects" ? "block" : "hidden"}>
                  {projectId ? (
                    <ProjectDetail platformState={platformState} />
                  ) : (
                    <Projects platformState={platformState} />
                  )}
                </div>
              )}

              {isAdmin && visitedTabs.has("admin") && (
                <div className={platformState.activeTab === "admin" ? "block" : "hidden"}>
                  <AdminPanel />
                </div>
              )}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
