import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin, executeQuery } from '@/database/supabase'

// Carregar admin emails de variável de ambiente
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
)

const isAdminEmail = (email: string | undefined | null): boolean =>
  Boolean(email && ADMIN_EMAILS.has(email.toLowerCase()))

// Estender o tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name?: string | null
        role?: string
        status?: string
        avatarUrl?: string | null
      }
    }
  }
}

/**
 * Middleware de autenticação usando Supabase Auth
 *
 * Valida o JWT token do Supabase usando supabaseAdmin.auth.getUser()
 * Isso é o método recomendado oficial do Supabase, pois:
 * - Valida o token diretamente com o Supabase Auth
 * - Suporta revogação instantânea de tokens
 * - Não precisa de JWT_SECRET ou JWKS
 * - Sempre sincronizado com o estado real da autenticação
 */
export const supabaseMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rid = res.getHeader('X-Request-ID') || req.headers['x-request-id']
    const t0 = Date.now()
    const authHeader = req.headers.authorization

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H9',location:'supabaseMiddleware.ts:49',message:'auth middleware entry',data:{path:req.path,method:req.method,hasAuthHeader:Boolean(authHeader)},timestamp:Date.now()})}).catch(()=>{});
    if (process.env.DEBUG_SUPABASE_AUTH === 'true') {
      console.log('[supabaseMiddleware] entry', { rid: String(rid ?? ''), path: req.path, method: req.method, hasAuthHeader: Boolean(authHeader) })
    }
    // #endregion

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de acesso requerido' })
      return
    }

    const token = authHeader.substring(7)

    // Validar token usando Supabase Auth API (com SERVICE_ROLE_KEY para bypass RLS)
    // Isso verifica: assinatura, expiração, revogação, etc.
    const tAuth0 = Date.now()
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    const tAuthMs = Date.now() - tAuth0

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/62bce363-02cc-4065-932e-513e49bd2fed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H9',location:'supabaseMiddleware.ts:63',message:'auth.getUser result',data:{hasUser:Boolean(user),hasError:Boolean(error),authMs:tAuthMs},timestamp:Date.now()})}).catch(()=>{});
    if (process.env.DEBUG_SUPABASE_AUTH === 'true') {
      console.log('[supabaseMiddleware] getUser', { rid: String(rid ?? ''), hasUser: Boolean(user), hasError: Boolean(error), authMs: tAuthMs })
    }
    // #endregion

    if (error || !user) {
      console.error('Erro ao validar token Supabase:', error?.message || 'User não encontrado')
      console.error(`[supabaseMiddleware] rid=${String(rid ?? '')} authMs=${tAuthMs}`)
      res.status(401).json({ error: 'Token inválido ou expirado' })
      return
    }

    // Verificar se usuário existe na tabela users
    let userProfile: { id: string; email: string; name?: string | null; role?: string; status?: string; avatar_url?: string | null } | null = null

    try {
      const tProfile0 = Date.now()
      const result = await executeQuery(
        supabaseAdmin
          .from('users')
          .select('id, email, name, role, status, avatar_url')
          .eq('id', user.id)
          .maybeSingle()
      )
      const tProfileMs = Date.now() - tProfile0

      userProfile = result.data
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[supabaseMiddleware] rid=${String(rid ?? '')} authMs=${tAuthMs} profileSelectMs=${tProfileMs} found=${Boolean(userProfile)}`)
      }
    } catch (err: any) {
      console.error('Erro ao buscar perfil do usuário:', err.message)
      console.error(`[supabaseMiddleware] rid=${String(rid ?? '')} authMs=${tAuthMs} profileSelectError`)
      // Continua para criar perfil padrão
    }

    // Criar perfil padrão se usuário não existir
    if (!userProfile) {
      const email = user.email?.toLowerCase() || ''
      const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        email.split('@')[0] ||
        'Usuário'
      const role = isAdminEmail(email) ? 'admin' : 'user'

      const avatarUrl = user.user_metadata?.avatar_url || null

      const defaultUserData = {
        id: user.id,
        email: email,
        name: name,
        avatar_url: avatarUrl,
        role,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      try {
        const tInsert0 = Date.now()
        await executeQuery(
          supabaseAdmin
            .from('users')
            .insert(defaultUserData)
        )
        const tInsertMs = Date.now() - tInsert0

        console.log(`Perfil padrão criado para novo usuário: ${user.id}`)
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[supabaseMiddleware] rid=${String(rid ?? '')} insertProfileMs=${tInsertMs}`)
        }
        userProfile = {
          id: user.id,
          email: email,
          name: name,
          role,
          status: 'active',
          avatar_url: avatarUrl
        }
      } catch (upsertError: any) {
        console.error('Erro ao criar perfil padrão:', upsertError.message)
        console.error(`[supabaseMiddleware] rid=${String(rid ?? '')} insertProfileError`)
        // Continua mesmo com erro, usando dados do auth user
        userProfile = {
          id: user.id,
          email: email,
          name: name,
          role,
          status: 'active',
          avatar_url: avatarUrl
        }
      }
    }

    // Sincronizar avatar_url e name do Auth → tabela users (se mudou)
    const authAvatarUrl = user.user_metadata?.avatar_url || null
    const authName = user.user_metadata?.name || user.user_metadata?.full_name || null
    const needsSync =
      (authAvatarUrl && authAvatarUrl !== userProfile.avatar_url) ||
      (authName && authName !== userProfile.name)

    if (needsSync) {
      try {
        const syncData: Record<string, string> = { updated_at: new Date().toISOString() }
        if (authAvatarUrl && authAvatarUrl !== userProfile.avatar_url) {
          syncData.avatar_url = authAvatarUrl
          userProfile.avatar_url = authAvatarUrl
        }
        if (authName && authName !== userProfile.name) {
          syncData.name = authName
          userProfile.name = authName
        }
        await executeQuery(
          supabaseAdmin
            .from('users')
            .update(syncData)
            .eq('id', userProfile.id)
        )
      } catch (err: any) {
        console.error('Erro ao sincronizar perfil do Auth:', err.message)
      }
    }

    // Garantir admin para emails allowlisted (sem depender de migration/trigger)
    // Faz update apenas se necessário para evitar overhead em toda requisição.
    if (isAdminEmail(userProfile.email) && userProfile.role !== 'admin') {
      try {
        await executeQuery(
          supabaseAdmin
            .from('users')
            .update({ role: 'admin', updated_at: new Date().toISOString() })
            .eq('id', userProfile.id)
        )
        userProfile.role = 'admin'
      } catch (err: any) {
        console.error('Erro ao promover usuário para admin:', err.message)
      }
    }

    // Bloquear acesso caso usuário esteja desativado
    if (userProfile.status && userProfile.status !== 'active') {
      res.status(403).json({ error: 'Conta desativada. Contate um administrador.' })
      return
    }

    // Anexar usuário autenticado ao request
    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name || null,
      role: userProfile.role || 'user',
      status: userProfile.status || 'active',
      avatarUrl: userProfile.avatar_url || null
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[supabaseMiddleware] rid=${String(rid ?? '')} totalMs=${Date.now() - t0} userId=${req.user.id}`)
    }
    next()
  } catch (error: any) {
    console.error('Erro no middleware Supabase:', error?.message || error)
    res.status(401).json({ error: 'Erro ao validar autenticação' })
  }
}

/**
 * Middleware opcional de autenticação
 *
 * Similar ao supabaseMiddleware, mas NÃO bloqueia a requisição se não houver token.
 * Apenas popula req.user se um token válido estiver presente.
 * Útil para rotas que permitem acesso público mas oferecem funcionalidade extra para usuários autenticados.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    // Se não há token, continua sem autenticação (acesso público)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next()
      return
    }

    const token = authHeader.substring(7)

    // Validar token usando Supabase Auth API
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      // Token inválido, mas não bloqueia - continua como não autenticado
      next()
      return
    }

    // Buscar perfil do usuário
    let userProfile: { id: string; email: string; name?: string | null; role?: string; status?: string; avatar_url?: string | null } | null = null

    try {
      const result = await executeQuery(
        supabaseAdmin
          .from('users')
          .select('id, email, name, role, status, avatar_url')
          .eq('id', user.id)
          .maybeSingle()
      )
      userProfile = result.data
    } catch {
      // Erro ao buscar perfil, continua sem autenticação
      next()
      return
    }

    if (!userProfile) {
      // Usuário não tem perfil, continua sem autenticação
      next()
      return
    }

    // Verificar se usuário está ativo (mesma verificação do supabaseMiddleware)
    if (userProfile.status && userProfile.status !== 'active') {
      // Usuário desativado, continua sem autenticação
      next()
      return
    }

    // Garantir admin para emails allowlisted
    if (isAdminEmail(userProfile.email) && userProfile.role !== 'admin') {
      try {
        await executeQuery(
          supabaseAdmin
            .from('users')
            .update({ role: 'admin', updated_at: new Date().toISOString() })
            .eq('id', userProfile.id)
        )
        userProfile.role = 'admin'
      } catch {
        // Ignora erro de promoção
      }
    }

    // Anexar usuário autenticado ao request
    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name || null,
      role: userProfile.role || 'user',
      status: userProfile.status || 'active',
      avatarUrl: userProfile.avatar_url || null
    }

    next()
  } catch {
    // Qualquer erro, continua sem autenticação
    next()
  }
}
