import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicPaths = ['/login', '/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Evita interceptar rotas de API e arquivos estáticos
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  const isPublic = publicPaths.includes(pathname)

  // Cria response para poder modificar cookies
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Cria cliente Supabase para validar sessão
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Usa getSession ao invés de getUser - não faz chamada de rede se já tem cookie válido
  const { data: { session } } = await supabase.auth.getSession()
  const hasSession = !!session

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
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}