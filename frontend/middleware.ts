import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas públicas (acessíveis sem conta)
// /import-github-token: callback OAuth GitHub - deve carregar sem sessão para processar tokens
const publicPaths = ['/login', '/register', '/import-github-token', '/']

// Rotas privadas que requerem autenticação
const privatePathPrefixes = ['/home', '/codes', '/contents', '/projects', '/admin']

// Cache simples em memória para sessões (reduz rate limiting do Supabase)
interface CacheEntry {
  hasSession: boolean
  expiresAt: number
}

const sessionCache = new Map<string, CacheEntry>()
const CACHE_TTL = 30000 // 30 segundos
const CACHE_TTL_ERROR = 5000 // 5 segundos para erros

function getProjectRef(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (!supabaseUrl) return null
  try {
    const url = new URL(supabaseUrl)
    const hostname = url.hostname
    const parts = hostname.split('.')
    // xxx.supabase.co → projectRef = xxx; custom domains também usam subdomain como ref
    if (parts.length >= 2) {
      return parts[0]
    }
  } catch {
    /* URL inválida */
  }
  return null
}

function getCacheKey(req: NextRequest): string | null {
  const projectRef = getProjectRef()

  // Prioriza cookies do projeto atual (evita mistura com outros projetos Supabase)
  if (projectRef) {
    const baseCookie = req.cookies.get(`sb-${projectRef}-auth-token`)?.value
    if (baseCookie) return baseCookie
    // Supabase chunked cookies: sb-{ref}-auth-token.0, .1, etc
    const chunk0 = req.cookies.get(`sb-${projectRef}-auth-token.0`)?.value
    if (chunk0) return chunk0
  }

  // Fallback: localhost ou config sem projectRef
  const allCookies = req.cookies.getAll()
  for (const cookie of allCookies) {
    if (/^sb-[^-]+-auth-token$/.test(cookie.name)) {
      return cookie.value
    }
    if (/^sb-[^-]+-auth-token\.0$/.test(cookie.name)) {
      return cookie.value
    }
  }

  return null
}

function getCachedSession(cacheKey: string | null): boolean | null {
  if (!cacheKey) return null
  
  const entry = sessionCache.get(cacheKey)
  if (!entry) return null
  
  if (Date.now() > entry.expiresAt) {
    sessionCache.delete(cacheKey)
    return null
  }
  
  return entry.hasSession
}

function setCachedSession(cacheKey: string | null, hasSession: boolean, ttl: number = CACHE_TTL): void {
  if (!cacheKey) return
  
  sessionCache.set(cacheKey, {
    hasSession,
    expiresAt: Date.now() + ttl
  })
  
  // Limpa entradas expiradas periodicamente (mantém cache pequeno)
  if (sessionCache.size > 100) {
    const now = Date.now()
    for (const [key, entry] of sessionCache.entries()) {
      if (now > entry.expiresAt) {
        sessionCache.delete(key)
      }
    }
  }
}

function applyResponseCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
}

function getSupabaseCookieNames(req: NextRequest): string[] {
  return req.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith('sb-'))
}

function getAllCookieNames(req: NextRequest): string[] {
  return req.cookies.getAll().map((cookie) => cookie.name)
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  const res = NextResponse.next()
  const debugAuth = process.env.DEBUG_SUPABASE_AUTH === 'true'
  const _debugLocal = process.env.DEBUG_SUPABASE_AUTH_LOCAL === 'true'
  let cookiesSetCount = 0
  let cookiesRemoveCount = 0
  const _host = req.headers.get('host')
  const _allCookies = getAllCookieNames(req)
  const _supabaseCookies = getSupabaseCookieNames(req)

  // Evita interceptar rotas de API
  if (pathname.startsWith('/api')) return NextResponse.next()

  // REDIRECIONAMENTOS DE COMPATIBILIDADE (URLs antigas -> novas)
  if (pathname === '/' && searchParams.has('tab')) {
    const tab = searchParams.get('tab')
    const id = searchParams.get('id')
    
    // Mapeamento de tabs para novas rotas
    const tabToRoute: Record<string, string> = {
      'home': '/home',
      'codes': '/codes',
      'contents': '/contents',
      'projects': '/projects',
      'admin': '/admin'
    }
    
    if (tab && tabToRoute[tab]) {
      const url = req.nextUrl.clone()
      
      // Se tem ID, vai para rota dinâmica (exceto admin que não tem detalhe)
      if (id && tab !== 'admin') {
        url.pathname = `${tabToRoute[tab]}/${id}`
      } else {
        url.pathname = tabToRoute[tab]
      }
      
      // Remove o param 'tab' e 'id' antigos
      url.searchParams.delete('tab')
      url.searchParams.delete('id')
      
      // Mantém outros params (contentsTab, github_sync, etc)
      return NextResponse.redirect(url, 308)
    }
  }

  // Verifica se é rota pública
  const isPublic = publicPaths.includes(pathname) || pathname === '/'
  
  // Verifica se é rota privada (começa com algum dos prefixos privados)
  const isPrivate = privatePathPrefixes.some(prefix => pathname.startsWith(prefix))
  const hasOAuthFlags =
    searchParams.has('github_sync') ||
    searchParams.has('installation_id') ||
    searchParams.has('oauth_return')

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
          cookiesSetCount += 1
          if (debugAuth) {
            console.log('[middleware][supabase] set cookie', { name, pathname })
          }
        },
        remove(name: string, options) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 })
          cookiesRemoveCount += 1
          if (debugAuth) {
            console.log('[middleware][supabase] remove cookie', { name, pathname })
          }
        },
      },
    }
  )

  // Verifica cache antes de chamar Supabase para reduzir rate limiting
  const cacheKey = getCacheKey(req)
  let cachedResult = getCachedSession(cacheKey)
  const supabaseCookieNames = getSupabaseCookieNames(req)
  const hasAnySupabaseCookies = supabaseCookieNames.length > 0

  // Evita loop de redirect pós-login: se cache diz "sem sessão" mas há cookies auth,
  // revalida com Supabase (cache negativo pode estar obsoleto logo após login)
  if (cachedResult === false && hasAnySupabaseCookies) {
    cachedResult = null
  }

  let hasSession = false
  if (cachedResult !== null) {
    // Usa resultado do cache
    hasSession = cachedResult
    if (debugAuth) {
      console.log('[middleware][supabase] cache hit', {
        pathname,
        hasSession,
        cookiesSetCount,
        cookiesRemoveCount,
      })
    }
  } else {
    // Cache miss ou expirado - verifica no Supabase
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      const sessionExpiresAtMs = session?.expires_at ? session.expires_at * 1000 : null
      const sessionExpiresInMs = sessionExpiresAtMs ? sessionExpiresAtMs - Date.now() : null
      // Se houver erro (ex: rate limit), não bloqueia - deixa passar e o cliente tratará
      if (!error && session?.user) {
        hasSession = true
      }
      if (debugAuth) {
        console.log('[middleware][supabase] getSession result', {
          pathname,
          hasSession,
          hasError: Boolean(error),
          hasSessionUser: Boolean(session?.user),
          sessionExpiresInMs,
          cookiesSetCount,
          cookiesRemoveCount,
        })
      }
      // Cache negativo com cookies auth: TTL curto (2s) para revalidar logo após login
      const negativeTtl = hasAnySupabaseCookies ? 2000 : CACHE_TTL
      setCachedSession(cacheKey, hasSession, hasSession ? CACHE_TTL : negativeTtl)

      if (!hasSession && !isPublic) {
        const supabaseCookies = getSupabaseCookieNames(req)
        console.warn('[middleware][auth] sessão ausente no getSession', {
          host: req.headers.get('host'),
          pathname,
          hasError: Boolean(error),
          errorMessage: error?.message,
          hasSupabaseCookies: supabaseCookies.length > 0,
          supabaseCookies,
          sessionExpiresInMs
        })
      }
    } catch (error) {
      // Em caso de erro (rate limit, etc), não bloqueia a requisição
      // O cliente tratará a autenticação no lado do browser
      console.warn('Middleware: erro ao verificar sessão (não bloqueando):', error)
      hasSession = false
      if (debugAuth) {
        console.log('[middleware][supabase] getSession exception', {
          pathname,
          cookiesSetCount,
          cookiesRemoveCount,
        })
      }
      // Cache resultado negativo por menos tempo (5s) para retentar mais cedo
      setCachedSession(cacheKey, false, CACHE_TTL_ERROR)
    }
  }

  // Bloqueia rotas privadas se não houver sessão válida
  if (isPrivate && !hasSession && !hasOAuthFlags) {
    const supabaseCookies = getSupabaseCookieNames(req)
    console.warn('[middleware][auth] redirect para login por sessão ausente', {
      host: req.headers.get('host'),
      pathname,
      search: req.nextUrl.search,
      hasSupabaseCookies: supabaseCookies.length > 0,
      supabaseCookies,
      cacheHit: cachedResult !== null,
      cacheResult: cachedResult
    })
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    // Preserva a URL completa para redirecionamento pós-login
    const fullPath = pathname + (req.nextUrl.search || '')
    url.searchParams.set('redirect', fullPath)
    const redirect = NextResponse.redirect(url)
    applyResponseCookies(redirect, res)
    return redirect
  }

  if (isPrivate && !hasSession && hasOAuthFlags) {
    const supabaseCookies = getSupabaseCookieNames(req)
    console.warn('[middleware][auth] bypass de login por flags OAuth/GitSync', {
      host: req.headers.get('host'),
      pathname,
      search: req.nextUrl.search,
      hasSupabaseCookies: supabaseCookies.length > 0,
      supabaseCookies
    })
  }

  // Se usuário logado acessa a raiz, redireciona para /home
  if (pathname === '/' && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/home'
    const redirect = NextResponse.redirect(url)
    applyResponseCookies(redirect, res)
    return redirect
  }

  // Evita acesso a login/register se já autenticado
  // EXCEÇÃO: /import-github-token é callback OAuth - deve carregar mesmo com sessão para processar tokens
  if ((pathname === '/login' || pathname === '/register') && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/home'
    url.search = ''
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