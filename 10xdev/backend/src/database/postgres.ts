import { Pool, PoolClient } from 'pg'
import dotenv from 'dotenv'
import type { CardFeatureScreen } from '../types/cardfeature'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable')
}

const getConnectionConfig = () => {
  const url = new URL(databaseUrl!)
  
  if (process.env.DATABASE_SSL !== 'true') {
    url.searchParams.set('sslmode', 'disable')
  }
  
  return {
    connectionString: url.toString(),
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true, require: true } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  }
}

export const pool = new Pool(getConnectionConfig())

pool.on('connect', (client: PoolClient) => {})

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
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


export const query = async (text: string, params?: any[]) => {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

process.on('SIGINT', () => {
  pool.end()
})

process.on('SIGTERM', () => {
  pool.end()
})