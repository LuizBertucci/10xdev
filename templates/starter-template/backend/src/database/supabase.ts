import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath, override: true })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not configured')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export const executeQuery = async (queryBuilder: any) => {
  try {
    const result = await queryBuilder

    if (!result) {
      return { data: null, error: null, count: null }
    }

    if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
      const { data, error, count, ...rest } = result

      if (error) {
        const err: any = new Error(error.message || 'Database error')
        err.code = error.code
        err.details = error.details
        err.hint = error.hint

        if (error.code === 'PGRST116') {
          err.statusCode = 404
        } else if (error.code === '23505') {
          err.statusCode = 409
        } else if (error.code === '23503') {
          err.statusCode = 400
        } else {
          err.statusCode = 500
        }

        throw err
      }

      return { data, error, count, ...rest }
    }

    return { data: result, error: null, count: null }
  } catch (err) {
    console.error('Query error:', err)
    throw err
  }
}

export const paginate = (queryBuilder: any, page: number = 1, limit: number = 10) => {
  const offset = (page - 1) * limit
  return queryBuilder.range(offset, offset + limit - 1)
}
