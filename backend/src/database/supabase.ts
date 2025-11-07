import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Carregar .env do diretório do backend especificamente
// Usar process.cwd() para garantir que leia do diretório onde o processo foi iniciado
const envPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: envPath, override: true })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Cliente público (para operações básicas)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente administrativo (para operações privilegiadas)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})