'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function DebugPage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          setError(error.message)
          setSession(null)
        } else {
          setSession(session)
          setError(null)
        }
      } catch (err: any) {
        setError(err.message)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug: Supabase Session</h1>
      
      {loading && <p>Carregando...</p>}
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          <strong>Erro:</strong> {error}
        </div>
      )}
      
      {session ? (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
          <p><strong>✅ Sessão Ativa</strong></p>
          <p>Email: {session.user?.email}</p>
          <p>User ID: {session.user?.id}</p>
          <p>Token Type: {session.token_type}</p>
          <p>Expires In: {session.expires_in}s</p>
          <p>Expires At: {new Date((session.expires_at ?? 0) * 1000).toISOString()}</p>
          <p>Has Access Token: {session.access_token ? '✅' : '❌'}</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff0f0', padding: '10px', borderRadius: '5px' }}>
          <p><strong>❌ Sem Sessão</strong></p>
          <p>O usuário não está autenticado ou sessão expirou.</p>
        </div>
      )}
    </div>
  )
}
