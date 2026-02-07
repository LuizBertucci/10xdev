import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas públicas (acessíveis sem conta)
const publicPaths = ['/login', '/register']

// Cache simples em memória para sessões (reduz rate limiting do Supabase)
interface CacheEntry {
  hasSession: boolean
  expiresAt: number
}

const sessionCache = new Map<string, CacheEntry>()
const CACHE_TTL = 30000 // 30 segundos
const CACHE_TTL_ERROR = 5000 // 5 segundos para erros

function getCacheKey(req: NextRequest): string | null {
  // Usa o cookie de sessão do Supabase como chave de cache
  const sessionCookie = req.cookies.get('sb-access-token')?.value || 
                       req.cookies.get('sb-refresh-token')?.value
  return sessionCookie || null
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

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  const res = NextResponse.next()
  const debugAuth = process.env.DEBUG_SUPABASE_AUTH === 'true'
  const debugLocal = process.env.DEBUG_SUPABASE_AUTH_LOCAL === 'true'
  let cookiesSetCount = 0
  let cookiesRemoveCount = 0

  // #region agent log
  if (debugLocal) {
    fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H1',location:'middleware.ts:15',message:'middleware entry',data:{pathname,hasTab:Boolean(searchParams.get('tab'))},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion

  // Evita interceptar rotas de API
  if (pathname.startsWith('/api')) return NextResponse.next()

  // Regra especial:
  // - `/` (sem query `tab`) é público
  // - `/?tab=...` é privado (app)
  const isRootLanding = pathname === '/' && !searchParams.get('tab')
  const isPublic = isRootLanding || publicPaths.includes(pathname)

  // #region agent log
  if (debugLocal) {
    fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H2',location:'middleware.ts:26',message:'public route computed',data:{isRootLanding,isPublic},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion

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
  const cachedResult = getCachedSession(cacheKey)
  
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
      // #region agent log
      if (debugLocal) {
        fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H3',location:'middleware.ts:51',message:'before getSession',data:{pathname},timestamp:Date.now()})}).catch(()=>{});
      }
      // #endregion
      const { data: { session }, error } = await supabase.auth.getSession()
      // Se houver erro (ex: rate limit), não bloqueia - deixa passar e o cliente tratará
      if (!error && session?.user) {
        hasSession = true
      }
      if (debugAuth) {
        console.log('[middleware][supabase] getSession result', {
          pathname,
          hasSession,
          hasError: Boolean(error),
          cookiesSetCount,
          cookiesRemoveCount,
        })
      }
      // #region agent log
      if (debugLocal) {
        fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H3',location:'middleware.ts:55',message:'after getSession',data:{hasSession,hasError:Boolean(error)},timestamp:Date.now()})}).catch(()=>{});
      }
      // #endregion
      // Armazena no cache (mesmo se não houver sessão, para evitar chamadas repetidas)
      setCachedSession(cacheKey, hasSession)
    } catch (error) {
      // Em caso de erro (rate limit, etc), não bloqueia a requisição
      // O cliente tratará a autenticação no lado do browser
      console.warn('Middleware: erro ao verificar sessão (não bloqueando):', error)
      // #region agent log
      if (debugLocal) {
        fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H4',location:'middleware.ts:60',message:'getSession exception',data:{hasSession:false,errorType:error instanceof Error ? error.name : typeof error},timestamp:Date.now()})}).catch(()=>{});
      }
      // #endregion
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
  if (!isPublic && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname + req.nextUrl.search)
    const redirect = NextResponse.redirect(url)
    applyResponseCookies(redirect, res)
    // #region agent log
    if (debugLocal) {
      fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H5',location:'middleware.ts:70',message:'redirect to login',data:{pathname},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
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
    // #region agent log
    if (debugLocal) {
      fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H5',location:'middleware.ts:81',message:'redirect to app',data:{pathname},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
    return redirect
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}