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

  // Cria e cacheia a instância com storage customizado para tratar erros
  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          try {
            const item = localStorage.getItem(key)
            // Verificar se o item é válido JSON
            if (item && item.startsWith('base64-')) {
              // Se estiver no formato base64, tentar decodificar
              try {
                const decoded = atob(item.replace('base64-', ''))
                JSON.parse(decoded) // Validar se é JSON válido
                return item
              } catch (e) {
                // Se falhar, limpar o item corrompido
                console.warn(`Item corrompido detectado para key ${key}, limpando...`)
                localStorage.removeItem(key)
                return null
              }
            }
            return item
          } catch (error) {
            console.error('Erro ao ler localStorage:', error)
            return null
          }
        },
        setItem: (key: string, value: string) => {
          try {
            localStorage.setItem(key, value)
          } catch (error) {
            console.error('Erro ao salvar no localStorage:', error)
          }
        },
        removeItem: (key: string) => {
          try {
            localStorage.removeItem(key)
          } catch (error) {
            console.error('Erro ao remover do localStorage:', error)
          }
        },
      },
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return supabaseClient
}

