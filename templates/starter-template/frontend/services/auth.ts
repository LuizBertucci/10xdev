import { createClient } from '@/lib/supabase'

const supabase = createClient()

export type User = {
  id: string
  email: string | null
  name?: string | null
  role?: string | null
  status?: string | null
  avatarUrl?: string | null
}

export type RegisterData = {
  name: string
  email: string
  password: string
}

export type LoginData = {
  email: string
  password: string
}

export default supabase
