import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

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
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          role: 'admin' | 'user'
          first_name?: string
          last_name?: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          role?: 'admin' | 'user'
          first_name?: string
          last_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          role?: 'admin' | 'user'
          first_name?: string
          last_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      jwt_denylist: {
        Row: {
          id: string
          jti: string
          exp: string
          created_at: string
        }
        Insert: {
          id?: string
          jti: string
          exp: string
          created_at?: string
        }
        Update: {
          id?: string
          jti?: string
          exp?: string
          created_at?: string
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

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error(`
🔴 Supabase configuration error!
Missing environment variables:
- SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}
- SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌'}
- SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? '✅' : '❌'}

Please check your .env file configuration.
`)
}

// Public client (for general operations)
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl as string,
  supabaseAnonKey as string,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
)

// Admin client (for server-side operations with elevated permissions)
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl as string,
  supabaseServiceRoleKey as string,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
)

// Typed clients for better TypeScript support
export const supabaseTyped: SupabaseClient<Database> = supabase
export const supabaseAdminTyped: SupabaseClient<Database> = supabaseAdmin

// Database health check with fallback
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true })
    
    if (error) {
      console.warn('⚠️ Supabase connection failed, using fallback database:', error.message)
      return false
    }
    
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.warn('⚠️ Supabase connection error, using fallback database:', error)
    return false
  }
}

// Initialize database with admin user
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Check if admin user exists
    const { data: existingAdmin } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', 'admin@10xdev.com')
      .single()

    if (!existingAdmin) {
      // Create admin user
      const { data: adminUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email: 'admin@10xdev.com',
          password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLegNRgKKKK2cka', // Admin123!
          role: 'admin',
          first_name: 'Admin',
          last_name: 'User',
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to create admin user:', error.message)
      } else {
        console.log('✅ Admin user created successfully')
      }
    } else {
      console.log('✅ Admin user already exists')
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error)
  }
}

console.log('🚀 Supabase client configured successfully')
console.log(`📍 Database URL: ${supabaseUrl}`)