import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import type { Database } from '@/types/cardfeature'

// Load environment variables from backend/.env with absolute path
const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath, override: true })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Credenciais do Supabase não configuradas')
}

// Cliente Supabase tipado
export const supabase = createClient<Database>(supabaseUrl, supabaseKey)