'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import Home from '@/pages/Home'

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-x-hidden">
      <header className="bg-white/80 shadow-sm border-b backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img
                src="/brand/10xdev-logo-sem-fundo.png"
                alt="10xDev"
                className="h-8 w-auto"
              />
              <span className="sr-only">10xDev</span>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/register">Criar conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Home isPublic />
      </main>
    </div>
  )
}

