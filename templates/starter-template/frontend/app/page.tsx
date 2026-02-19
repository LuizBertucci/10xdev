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
            <h1 className="text-xl font-bold">Admin</h1>
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
        <div className="flex items-start justify-between gap-6 mb-10 flex-col md:flex-row">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              Base pronta com Next.js, Express e Supabase. Use este painel como ponto
              inicial para administrar o projeto.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/login">Acessar</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Criar conta</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card>
            <CardHeader>
              <CardTitle>Autenticação</CardTitle>
              <CardDescription>
                Supabase Auth com login, registro e sessão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Fluxo pronto para rotas protegidas e perfis.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API configurada</CardTitle>
              <CardDescription>
                Express com TypeScript e middleware essencial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                CORS, rate limit, erros tratados e CRUD de exemplo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>UI moderna</CardTitle>
              <CardDescription>
                shadcn/ui com Tailwind CSS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Componentes acessíveis, prontos para customizar.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status do usuário</CardTitle>
              <CardDescription>
                Informações rápidas sobre a sessão atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user ? (
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium text-gray-900">Email:</span> {user.email}</p>
                  <p><span className="font-medium text-gray-900">User ID:</span> {user.id}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Faça login para ver informações do usuário.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API de exemplo</CardTitle>
              <CardDescription>
                Endpoint pronto para testar integrações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Teste o endpoint em{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  /api/examples
                </code>
                {" "}e comece a criar seus módulos.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
