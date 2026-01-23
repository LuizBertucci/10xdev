import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas públicas (acessíveis sem conta)
const publicPaths = ['/login', '/register']

function applyResponseCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  let res = NextResponse.next()

  // Evita interceptar rotas de API
  if (pathname.startsWith('/api')) return NextResponse.next()

  // Regra especial:
  // - `/` (sem query `tab`) é público
  // - `/?tab=...` é privado (app)
  const isRootLanding = pathname === '/' && !searchParams.get('tab')
  const isPublic = isRootLanding || publicPaths.includes(pathname)

  // Cria cliente Supabase para validar sessão
  // Usa getSession() em vez de getUser() para evitar refresh token automático
  // que pode causar rate limiting quando chamado em todas as requisições
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  // Usa getSession() que é mais leve e não força refresh token
  // Se houver erro (ex: rate limit), trata como sem sessão para não bloquear
  let hasSession = false
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    // Se houver erro (ex: rate limit), não bloqueia - deixa passar e o cliente tratará
    if (!error && session?.user) {
      hasSession = true
    }
  } catch (error) {
    // Em caso de erro (rate limit, etc), não bloqueia a requisição
    // O cliente tratará a autenticação no lado do browser
    console.warn('Middleware: erro ao verificar sessão (não bloqueando):', error)
    hasSession = false
  }

  // Bloqueia rotas privadas se não houver sessão válida
  if (!isPublic && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname + req.nextUrl.search)
    const redirect = NextResponse.redirect(url)
    applyResponseCookies(redirect, res)
    return redirect
  }

  // Evita acesso a login/register se já autenticado
  if (isPublic && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    // Usuário autenticado deve cair no app (não na landing)
    url.search = '?tab=home'
    const redirect = NextResponse.redirect(url)
    applyResponseCookies(redirect, res)
    return redirect
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}