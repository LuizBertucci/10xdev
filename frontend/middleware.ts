import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Default route após login (home)
const DEFAULT_ROUTE = '/'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/register']

  // Permitir acesso a arquivos estáticos e APIs
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // Se for rota pública, permitir acesso
  if (publicPaths.includes(pathname)) {
    // Verificar se já está autenticado e redirecionar para home
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set() {},
            remove() {},
          },
        }
      )

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Usuário autenticado tentando acessar login/register, redirecionar para home
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/'
        redirectUrl.search = ''
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      // Em caso de erro, permitir acesso à rota pública
      console.error('Erro ao verificar autenticação em rota pública:', error)
    }

    return NextResponse.next()
  }

  // Para todas as outras rotas, verificar autenticação
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // Se não autenticado, redirecionar para login
    if (!user || error) {
      console.log('Usuário não autenticado, redirecionando para login. Pathname:', pathname)
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      
      // Preservar query params se existirem (ex: ?tab=dashboard)
      if (pathname === '/' && request.nextUrl.search) {
        redirectUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`)
      } else if (pathname !== '/') {
        redirectUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
      } else {
        // Se não há query params e está na rota raiz, redirecionar para home após login
        redirectUrl.searchParams.set('redirect', DEFAULT_ROUTE)
      }
      
      return NextResponse.redirect(redirectUrl)
    }

    // Usuário autenticado, permitir acesso
    return response
  } catch (error) {
    console.error('Erro no middleware:', error)
    // Em caso de erro, redirecionar para login por segurança
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

