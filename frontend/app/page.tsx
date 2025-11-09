"use client"

import { Zap } from "lucide-react"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePlatform } from "@/hooks/use-platform"
import { useSearchParams } from "next/navigation"
import AppSidebar from "@/components/AppSidebar"
import Home from "@/pages/Home"
import Codes from "@/pages/Codes"
import Dashboard from "@/pages/Dashboard"
import ProtectedRoute from "@/components/ProtectedRoute"
import Videos from "@/pages/Videos"
import VideoDetail from "@/pages/VideoDetail"

export default function DevPlatform() {
  const platformState = usePlatform()
  const searchParams = useSearchParams()
  const videoId = searchParams?.get('id') || null

  return (
    <ProtectedRoute>
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
              {/* Home Tab */}
              {platformState.activeTab === "home" && <Home platformState={platformState} />}

              {/* Codes Tab */}
              {platformState.activeTab === "codes" && <Codes platformState={platformState} />}

              {/* Dashboard Tab */}
              {platformState.activeTab === "dashboard" && <Dashboard platformState={platformState} />}

              {/* Videos Tab */}
              {platformState.activeTab === "videos" && videoId ? (
                <VideoDetail platformState={platformState} />
              ) : (
                platformState.activeTab === "videos" && <Videos platformState={platformState} />
              )}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
