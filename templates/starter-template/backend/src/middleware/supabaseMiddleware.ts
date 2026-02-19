import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin, executeQuery } from '@/database/supabase'

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
)

const isAdminEmail = (email: string | undefined | null): boolean =>
  Boolean(email && ADMIN_EMAILS.has(email.toLowerCase()))

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

export const supabaseMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access token required' })
      return
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

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
    } catch (err: any) {
      console.error('Error fetching user profile:', err.message)
    }

    if (!userProfile) {
      const email = user.email?.toLowerCase() || ''
      const name = user.user_metadata?.name || user.user_metadata?.full_name || email.split('@')[0] || 'User'
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
        await executeQuery(supabaseAdmin.from('users').insert(defaultUserData))
        userProfile = { id: user.id, email: email, name: name, role, status: 'active', avatar_url: null }
      } catch (upsertError: any) {
        userProfile = { id: user.id, email: email, name: name, role, status: 'active', avatar_url: null }
      }
    }

    if (isAdminEmail(userProfile.email) && userProfile.role !== 'admin') {
      try {
        await executeQuery(
          supabaseAdmin
            .from('users')
            .update({ role: 'admin', updated_at: new Date().toISOString() })
            .eq('id', userProfile.id)
        )
        userProfile.role = 'admin'
      } catch {}
    }

    if (userProfile.status && userProfile.status !== 'active') {
      res.status(403).json({ error: 'Account disabled' })
      return
    }

    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name || null,
      role: userProfile.role || 'user',
      status: userProfile.status || 'active',
      avatarUrl: userProfile.avatar_url || null
    }

    next()
  } catch (error: any) {
    res.status(401).json({ error: 'Authentication error' })
  }
}

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next()
      return
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      next()
      return
    }

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
      next()
      return
    }

    if (!userProfile || (userProfile.status && userProfile.status !== 'active')) {
      next()
      return
    }

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
    next()
  }
}
