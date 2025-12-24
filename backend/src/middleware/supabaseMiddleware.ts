import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin, executeQuery } from '@/database/supabase'

const ADMIN_EMAILS = new Set(['augustoc.amado@gmail.com'])
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

      const defaultUserData = {
        id: user.id,
        email: email,
        name: name,
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
          avatar_url: null
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
          avatar_url: null
        }
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
