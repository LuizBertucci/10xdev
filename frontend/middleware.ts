import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Rotas públicas (apenas estas rotas podem ser acessadas sem autenticação)
 * TODAS as outras rotas exigem login obrigatório
 */
const publicRoutes = ['/login', '/signup', '/forgot-password', '/auth/callback', '/auth/verify-email']

/**
 * Rotas de autenticação (redireciona para dashboard se já autenticado)
 */
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar se a rota é pública
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // ⚠️ PROTEÇÃO TOTAL: Se não está autenticado E não é rota pública → REDIRECIONA PARA LOGIN
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se já está autenticado e tenta acessar login/signup → redireciona para dashboard
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
