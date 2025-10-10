import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Rotas públicas (não requerem autenticação)
 */
const publicRoutes = ['/login', '/signup', '/forgot-password', '/auth/callback', '/auth/verify-email']

/**
 * Rotas de autenticação (redireciona para dashboard se já autenticado)
 */
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Se é rota de auth e usuário já está autenticado, redireciona para dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Se não é rota pública e usuário não está autenticado, redireciona para login
  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
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
