import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Cache da instância (singleton pattern)
let supabaseClient: SupabaseClient | null = null

/**
 * Retorna ou cria o cliente Supabase para browser (padrão singleton)
 * Valida as credenciais do Supabase e lança erro se não estiverem configuradas
 * @returns Instância cacheada do cliente Supabase
 * @throws Error se NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não estiverem definidas
 */
export function createClient(): SupabaseClient {
  // Retorna instância cacheada se já existir
  if (supabaseClient) return supabaseClient

  // Valida variáveis de ambiente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Credenciais do Supabase não configuradas no frontend (verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  // Cria e cacheia a instância
  // Usando configuração padrão do createBrowserClient que utiliza cookies automaticamente.
  // Isso garante sincronia entre cliente e middleware.
  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey) as unknown as SupabaseClient
  return supabaseClient
}

