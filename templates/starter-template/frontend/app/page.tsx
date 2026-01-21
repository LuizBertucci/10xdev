"use client"

import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function Home() {
  const { user, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold">Starter Template</h1>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">{user.email}</span>
                  <Button variant="outline" onClick={logout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline">Login</Button>
                  </Link>
                  <Link href="/register">
                    <Button>Register</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Your Starter Template
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A full-stack starter with Next.js 15, Express, Supabase, and Shadcn/ui.
            Start building your app right away!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Supabase Auth with login, register, and session management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Ready-to-use authentication flow with protected routes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Ready</CardTitle>
              <CardDescription>
                Express backend with TypeScript and middleware
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                CORS, rate limiting, error handling, and example CRUD endpoints.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modern UI</CardTitle>
              <CardDescription>
                Shadcn/ui components with Tailwind CSS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Beautiful, accessible components ready to customize.
              </p>
            </CardContent>
          </Card>
        </div>

        {user && (
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle>You are logged in!</CardTitle>
                <CardDescription>
                  User ID: {user.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Start building your authenticated features. Check the API at{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    /api/examples
                  </code>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
