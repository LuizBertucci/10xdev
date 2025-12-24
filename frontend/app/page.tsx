"use client"

import { Zap } from "lucide-react"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePlatform } from "@/hooks/use-platform"
import { useSearchParams } from "next/navigation"
import AppSidebar from "@/components/AppSidebar"
import Home from "@/screens/Home"
import Codes from "@/screens/Codes"
import ProtectedRoute from "@/components/ProtectedRoute"
import Videos from "@/screens/Videos"
import VideoDetail from "@/screens/VideoDetail"
import Projects from "@/screens/Projects"
import ProjectDetail from "@/screens/ProjectDetail"
import AdminPanel from "@/screens/AdminPanel"
import { useAuth } from "@/hooks/useAuth"
import { useEffect } from "react"

export default function DevPlatform() {
  const platformState = usePlatform()
  const searchParams = useSearchParams()
  const activeTab = platformState.activeTab
  const videoId = activeTab === "videos" ? searchParams?.get('id') || null : null
  const projectId = activeTab === "projects" ? searchParams?.get('id') || null : null
  const { user, isProfileLoaded } = useAuth()

  // Hard-guard: se usuário não é admin, não deixa permanecer na tab admin
  useEffect(() => {
    // Importante: só aplicar o redirect depois que tentamos carregar o perfil (role/status).
    if (platformState.activeTab === "admin" && isProfileLoaded && user?.role !== "admin") {
      platformState.setActiveTab("home")
    }
  }, [platformState, user?.role, isProfileLoaded])

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
                      <Zap className="h-8 w-8 text-blue-600" />
                      <span className="text-2xl font-bold text-gray-900">10xDev</span>
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

              {/* Videos Tab */}
              {activeTab === "videos" && videoId ? (
                <VideoDetail platformState={platformState} />
              ) : (
                activeTab === "videos" && <Videos platformState={platformState} />
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
