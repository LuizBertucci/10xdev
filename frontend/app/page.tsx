"use client"

import { Zap, LogIn, User, Shield } from "lucide-react"
import { useEffect } from "react"
import Link from "next/link"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { usePlatform } from "@/hooks/use-platform"
import { useAuth } from "@/components/AuthContext"
import AppSidebar from "@/components/AppSidebar"
import UserProfile from "@/components/UserProfile"
import Home from "@/pages/Home"
import Codes from "@/pages/Codes"
import Lessons from "@/pages/Lessons"
import Projects from "@/pages/Projects"
import AI from "@/pages/AI"
import Dashboard from "@/pages/Dashboard"

export default function DevPlatform() {
  const platformState = usePlatform()
  const { isAuthenticated, user, logout } = useAuth()

  // Se autenticado, mostra a plataforma completa
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
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-900">10</span>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-gray-900">10xDev</span>
                  </div>
                </div>

                {/* Auth Section */}
                <div className="flex items-center space-x-4">
                  {isAuthenticated && user ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-700">
                        Olá, {user.first_name || user.email}
                      </span>
                      {user.role === 'admin' && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-medium">
                          Administrador
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={logout}
                        className="flex items-center space-x-1"
                      >
                        <User className="w-4 h-4" />
                        <span>Sair</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <Link href="/login">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex items-center space-x-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>Login</span>
                        </Button>
                      </Link>
                      <Link href="/register">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          <User className="w-4 h-4" />
                          <span>Cadastrar</span>
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Profile tab for authenticated users */}
            {platformState.activeTab === "profile" && (
              <div className="flex justify-center">
                <UserProfile />
              </div>
            )}

            {/* Platform Content */}
            {platformState.activeTab === "home" && <Home platformState={platformState} />}
            {platformState.activeTab === "codes" && <Codes platformState={platformState} />}
            {platformState.activeTab === "lessons" && <Lessons />}
            {platformState.activeTab === "projects" && <Projects />}
            {platformState.activeTab === "ai" && <AI />}
            {platformState.activeTab === "dashboard" && <Dashboard platformState={platformState} />}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}