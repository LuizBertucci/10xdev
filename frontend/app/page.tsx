"use client"

import { Zap } from "lucide-react"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePlatform } from "@/hooks/use-platform"
import { useSearchParams } from "next/navigation"
import AppSidebar from "@/components/AppSidebar"
import Home from "@/pages/Home"
import Codes from "@/pages/Codes"
import ProtectedRoute from "@/components/ProtectedRoute"
import Videos from "@/pages/Videos"
import VideoDetail from "@/pages/VideoDetail"
import Projects from "@/pages/Projects"
import ProjectDetail from "@/pages/ProjectDetail"

export default function DevPlatform() {
  const platformState = usePlatform()
  const searchParams = useSearchParams()
  const activeTab = platformState.activeTab
  const videoId = activeTab === "videos" ? searchParams?.get('id') || null : null
  const projectId = activeTab === "projects" ? searchParams?.get('id') || null : null

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
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
