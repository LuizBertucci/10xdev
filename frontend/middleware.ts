import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware da aplicação
 *
 * IMPORTANTE:
 * O projeto usa autenticação client-side (Supabase no browser).
 * Validar sessão aqui via cookies pode causar loop infinito (/ -> /login -> /)
 * quando o browser tem sessão mas o middleware não consegue enxergar via cookies.
 *
 * A proteção de rotas fica a cargo do `ProtectedRoute` no client.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Evita interceptar rotas de API
  if (pathname.startsWith('/api')) return NextResponse.next()

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}