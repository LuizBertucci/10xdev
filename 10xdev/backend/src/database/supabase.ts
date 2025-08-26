import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { CardFeatureScreen } from '../types/cardfeature'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Public client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface Database {
  public: {
    Tables: {
      card_features: {
        Row: {
          id: string
          title: string
          tech: string
          language: string
          description: string
          screens: CardFeatureScreen[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          tech: string
          language: string
          description: string
          screens: CardFeatureScreen[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          tech?: string
          language?: string
          description?: string
          screens?: CardFeatureScreen[]
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}


export const supabaseTyped = createClient<Database>(supabaseUrl, supabaseAnonKey)
export const supabaseAdminTyped = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})