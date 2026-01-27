"use client"


import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePlatform } from "@/hooks/use-platform"
import { useSearchParams } from "next/navigation"
import AppSidebar from "@/components/AppSidebar"
import Home from "@/pages/Home"
import Codes from "@/pages/Codes"
import ProtectedRoute from "@/components/ProtectedRoute"
import Contents from "@/pages/Contents"
import ContentDetail from "@/pages/ContentDetail"
import Projects from "@/pages/Projects"
import ProjectDetail from "@/pages/ProjectDetail"
import AdminPanel from "@/pages/AdminPanel"
import { useAuth } from "@/hooks/useAuth"
import { useEffect } from "react"
import PublicHome from "@/components/PublicHome"

export default function DevPlatform() {
  const searchParams = useSearchParams()
  const tab = searchParams?.get('tab')

  // Hooks must be called before any early returns
  const platformState = usePlatform()
  const { user, isProfileLoaded } = useAuth()
  const activeTab = platformState.activeTab
  const contentId = activeTab === "contents" ? searchParams?.get('id') || null : null
  const projectId = activeTab === "projects" ? searchParams?.get('id') || null : null

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
                    <div className="flex items-center space-x-2">
                      <img
                        src="/brand/Logo 10xDev Sem fundo.png"
                        alt="10xDev"
                        className="h-9 w-auto"
                      />
                      <span className="sr-only">10xDev</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
              {/* Home Tab */}
              {platformState.activeTab === "home" && <Home platformState={platformState} />}

              {/* Codes Tab */}
              {platformState.activeTab === "codes" && <Codes platformState={platformState} />}

              {/* Contents Tab */}
              {activeTab === "contents" && contentId ? (
                <ContentDetail platformState={platformState} />
              ) : (
                activeTab === "contents" && <Contents platformState={platformState} />
              )}

              {/* Projects Tab */}
              {activeTab === "projects" && projectId ? (
                <ProjectDetail platformState={platformState} />
              ) : (
                activeTab === "projects" && <Projects platformState={platformState} />
              )}

              {/* Admin Tab */}
              {platformState.activeTab === "admin" && user?.role === "admin" && <AdminPanel />}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
