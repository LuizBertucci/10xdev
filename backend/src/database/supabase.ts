import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

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

// Tipos do banco de dados
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          content_type: string
          card_type: string
          screens: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          tech: string
          language: string
          description: string
          content_type: string
          card_type: string
          screens: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          title?: string
          tech?: string
          language?: string
          description?: string
          content_type?: string
          card_type?: string
          screens?: Json
          created_at?: never
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Cliente tipado
export const supabaseTyped = createClient<Database>(supabaseUrl!, supabaseAnonKey!)
export const supabaseAdminTyped = createClient<Database>(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})