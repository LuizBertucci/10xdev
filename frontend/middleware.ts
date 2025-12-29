import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas públicas (acessíveis sem conta)
const publicPaths = ['/login', '/register']

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // Evita interceptar rotas de API
  if (pathname.startsWith('/api')) return NextResponse.next()

  // Regra especial:
  // - `/` (sem query `tab`) é público
  // - `/?tab=...` é privado (app)
  const isRootLanding = pathname === '/' && !searchParams.get('tab')
  const isPublic = isRootLanding || publicPaths.includes(pathname)

  // Cria cliente Supabase para validar sessão (igual à main)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const hasSession = !!user

  // Bloqueia rotas privadas se não houver sessão válida
  if (!isPublic && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname + req.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // Evita acesso a login/register se já autenticado
  if (isPublic && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    // Usuário autenticado deve cair no app (não na landing)
    url.search = '?tab=home'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}