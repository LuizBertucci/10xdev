import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Verificar se estamos em modo de desenvolvimento sem configuração do Supabase
const isDevelopmentMode = !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey

if (isDevelopmentMode) {
  console.log('⚠️  Supabase não configurado - Executando em modo de desenvolvimento')
  console.log('💡 Para produção, configure as variáveis: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
}

// Criar mock client completo para desenvolvimento
const createMockClient = () => {
  const mockQueryBuilder = {
    select: (columns?: string) => mockQueryBuilder,
    insert: (data: any) => mockQueryBuilder,
    update: (data: any) => mockQueryBuilder,
    delete: () => mockQueryBuilder,
    upsert: (data: any) => mockQueryBuilder,
    eq: (column: string, value: any) => mockQueryBuilder,
    neq: (column: string, value: any) => mockQueryBuilder,
    gt: (column: string, value: any) => mockQueryBuilder,
    gte: (column: string, value: any) => mockQueryBuilder,
    lt: (column: string, value: any) => mockQueryBuilder,
    lte: (column: string, value: any) => mockQueryBuilder,
    like: (column: string, pattern: string) => mockQueryBuilder,
    ilike: (column: string, pattern: string) => mockQueryBuilder,
    in: (column: string, values: any[]) => mockQueryBuilder,
    order: (column: string, options?: any) => mockQueryBuilder,
    limit: (count: number) => mockQueryBuilder,
    range: (from: number, to: number) => mockQueryBuilder,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null, count: 0 })
  }

  return {
    from: (table: string) => mockQueryBuilder,
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signIn: () => Promise.resolve({ data: { user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null })
    },
    storage: {
      from: (bucket: string) => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        remove: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
}

// Cliente público (para operações básicas)
export const supabase = isDevelopmentMode 
  ? createMockClient() 
  : createClient(supabaseUrl!, supabaseAnonKey!)

// Cliente administrativo (para operações privilegiadas)
export const supabaseAdmin = isDevelopmentMode 
  ? createMockClient()
  : createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

// Tipos do banco de dados (será expandido)
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

export interface CardFeatureScreen {
  name: string
  description: string
  code: string
}

// Cliente tipado
export const supabaseTyped = isDevelopmentMode 
  ? createMockClient() as any
  : createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  
export const supabaseAdminTyped = isDevelopmentMode 
  ? createMockClient() as any
  : createClient<Database>(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

// Flag para identificar se estamos em modo de desenvolvimento
export const isDevMode = isDevelopmentMode