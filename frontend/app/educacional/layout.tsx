"use client"

import { Zap } from "lucide-react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePlatform } from "@/hooks/use-platform"
import AppSidebar from "@/components/AppSidebar"

export default function EducacionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
