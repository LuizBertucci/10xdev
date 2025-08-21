"use client"

import { Zap } from "lucide-react"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePlatform } from "@/hooks/use-platform"
import AppSidebar from "@/components/AppSidebar"
import Home from "@/pages/Home"
import Codes from "@/pages/Codes"
import CodesV2 from "@/pages/CodesV2"
import Lessons from "@/pages/Lessons"
import Projects from "@/pages/Projects"
import AI from "@/pages/AI"
import Dashboard from "@/pages/Dashboard"

export default function DevPlatform() {
  const platformState = usePlatform()






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

            {platformState.activeTab === "codes-v2" && <CodesV2 platformState={platformState} />}

            {platformState.activeTab === "lessons" && <Lessons />}

            {platformState.activeTab === "projects" && <Projects />}
            {/* AI Integration Tab */}
            {platformState.activeTab === "ai" && <AI />}

            {platformState.activeTab === "dashboard" && <Dashboard platformState={platformState} />}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
