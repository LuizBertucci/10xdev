import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin, executeQuery } from '@/database/supabase'

// Estender o tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name?: string | null
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
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de acesso requerido' })
      return
    }

    const token = authHeader.substring(7)

    // Validar token usando Supabase Auth API (com SERVICE_ROLE_KEY para bypass RLS)
    // Isso verifica: assinatura, expiração, revogação, etc.
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      console.error('Erro ao validar token Supabase:', error?.message || 'User não encontrado')
      res.status(401).json({ error: 'Token inválido ou expirado' })
      return
    }

    // Verificar se usuário existe na tabela users
    let userProfile: { id: string; email: string; name?: string | null } | null = null

    try {
      const result = await executeQuery(
        supabaseAdmin
          .from('users')
          .select('id, email, name')
          .eq('id', user.id)
          .maybeSingle()
      )

      userProfile = result.data
    } catch (err: any) {
      console.error('Erro ao buscar perfil do usuário:', err.message)
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

      const defaultUserData = {
        id: user.id,
        email: email,
        name: name,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      try {
        await executeQuery(
          supabaseAdmin
            .from('users')
            .insert(defaultUserData)
        )

        console.log(`Perfil padrão criado para novo usuário: ${user.id}`)
        userProfile = {
          id: user.id,
          email: email,
          name: name
        }
      } catch (upsertError: any) {
        console.error('Erro ao criar perfil padrão:', upsertError.message)
        // Continua mesmo com erro, usando dados do auth user
        userProfile = {
          id: user.id,
          email: email,
          name: name
        }
      }
    }

    // Anexar usuário autenticado ao request
    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name || null
    }

    next()
  } catch (error: any) {
    console.error('Erro no middleware Supabase:', error?.message || error)
    res.status(401).json({ error: 'Erro ao validar autenticação' })
  }
}
