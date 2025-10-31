import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// ================================================
// CONFIGURAÇÃO DO CLIENTE
// ================================================

// Load environment variables from backend/.env with absolute path
const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath, override: true })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Credenciais do Supabase não configuradas')
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')
}

// Cliente Supabase público (com anon key)
export const supabase = createClient(supabaseUrl, supabaseKey)

// Cliente Supabase admin (com service role key - bypass RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

// ================================================
// QUERY EXECUTION HELPERS
// ================================================

/**
 * Helper universal para executar queries do Supabase
 * Preserva metadados do erro (code, details, hint) e adiciona statusCode
 *
 * Retorna o resultado completo: { data, error, count, ... }
 * Se houver erro, lança exceção com metadados preservados
 *
 * @example
 * // Single row
 * const result = await executeQuery(supabase.from('table').select('*').eq('id', id).single())
 * // result.data será o objeto ou null
 *
 * @example
 * // Array com count
 * const result = await executeQuery(supabase.from('table').select('*', { count: 'exact' }))
 * // result.data será array, result.count será número
 *
 * @example
 * // Delete
 * const result = await executeQuery(supabase.from('table').delete().eq('id', id))
 * // result.error será null se sucesso
 */
export const executeQuery = async (queryBuilder: any) => {
  try {
    const result = await queryBuilder

    // Verificar se result é null ou undefined
    if (!result) {
      return { data: null, error: null, count: null }
    }

    // Verificar se result já tem a estrutura esperada
    if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
      const { data, error, count, ...rest } = result

      if (error) {
        // Criar erro customizado preservando metadados do Supabase
        const err: any = new Error(error.message || 'Database error')
        err.code = error.code // Preserva código do Supabase (ex: PGRST116)
        err.details = error.details
        err.hint = error.hint

        // Mapear códigos do Supabase para HTTP status codes
        if (error.code === 'PGRST116') {
          // PGRST116: No rows found (quando usa .single())
          err.statusCode = 404
        } else if (error.code === '23505') {
          // 23505: unique_violation
          err.statusCode = 409
        } else if (error.code === '23503') {
          // 23503: foreign_key_violation
          err.statusCode = 400
        } else {
          // Outros erros são 500 (Internal Server Error)
          err.statusCode = 500
        }

        throw err
      }

      // Retornar objeto completo preservando data, count e outros campos
      return { data, error, count, ...rest }
    }

    // Se result não tem a estrutura esperada, retornar como data
    return { data: result, error: null, count: null }

  } catch (err) {
    console.error('Erro na execução da query:', err)
    throw err
  }
}

/**
 * Helper para pagination
 */
export const paginate = (queryBuilder: any, page: number = 1, limit: number = 10) => {
  const offset = (page - 1) * limit
  return queryBuilder.range(offset, offset + limit - 1)
}