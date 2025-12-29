import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicPaths = ['/login', '/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Evita interceptar rotas de API
  if (pathname.startsWith('/api')) return NextResponse.next()

  const isPublic = publicPaths.includes(pathname)

  // Response mutável (necessária para o Supabase persistir cookies da sessão)
  // Obs: @supabase/ssr (v0.1.x) usa a API cookies.getAll/setAll.
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Cria cliente Supabase para validar/atualizar sessão (cookies)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Atualiza para o request atual (execução do middleware)...
            req.cookies.set(name, value)
            // ... e persiste no browser via response.
            res.cookies.set(name, value, options)
          })
        }
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