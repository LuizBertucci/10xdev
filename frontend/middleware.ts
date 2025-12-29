import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicPaths = ['/login', '/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Evita interceptar rotas de API
  if (pathname.startsWith('/api')) return NextResponse.next()

  const isPublic = publicPaths.includes(pathname)

  // Cria uma response mutável para permitir que o Supabase atualize cookies (refresh de sessão)
  let res = NextResponse.next()

  // Cria cliente Supabase para validar/atualizar sessão
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Atualiza cookies na request (para o fluxo atual) e na response (para persistir no browser)
          req.cookies.set({ name, value, ...options })
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          req.cookies.set({ name, value: '', ...options })
          res.cookies.set({ name, value: '', ...options })
        },
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
    const redirectRes = NextResponse.redirect(url)
    // Preserva possíveis cookies atualizados pelo Supabase (ex: refresh/logout)
    res.cookies.getAll().forEach((cookie) => redirectRes.cookies.set(cookie))
    return redirectRes
  }

  // Evita acesso a login/register se já autenticado
  if (isPublic && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    const redirectRes = NextResponse.redirect(url)
    res.cookies.getAll().forEach((cookie) => redirectRes.cookies.set(cookie))
    return redirectRes
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}