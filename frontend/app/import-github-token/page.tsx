'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { projectService } from '@/services/projectService'

type Status = 'loading' | 'success' | 'error' | 'idle'

export default function ImportGithubTokenPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams?.get('token')
    const accessToken = searchParams?.get('access_token')
    const installationId = searchParams?.get('installation_id')
    const errorParam = searchParams?.get('error')

    // GitHub App OAuth callback (access_token + installation_id via backend redirect)
    if (accessToken || installationId) {
      handleGitSyncCallback(accessToken, installationId)
      return
    }

    // Error from backend OAuth callback
    if (errorParam) {
      setStatus('error')
      setMessage(decodeURIComponent(errorParam))
      return
    }

    // Legacy PAT token flow
    if (token) {
      const repoUrl = sessionStorage.getItem('pending_github_import_url')
      if (!repoUrl) {
        setStatus('error')
        setMessage('URL do repositório não encontrada. Tente novamente.')
        return
      }
      validateAndPrepare(token, repoUrl)
      return
    }

    setStatus('error')
    setMessage('Nenhum token ou código de autorização detectado. Tente novamente.')
  }, [searchParams])

  /** Handles GitHub App OAuth callback (from backend /api/gitsync/callback redirect) */
  const handleGitSyncCallback = (accessToken: string | null, installationId: string | null) => {
    setStatus('loading')
    setMessage('Conexão com GitHub realizada! Preparando...')

    try {
      // Store installation_id for ProjectForm to use
      if (installationId) {
        sessionStorage.setItem('gitsync_installation_id', installationId)
      }
      if (accessToken) {
        sessionStorage.setItem('gitsync_access_token', accessToken)
      }
    } catch {
      // ignore storage errors
    }

    setStatus('success')
    setMessage('GitHub conectado! Redirecionando...')

    // Redirect back to projects page with gitsync flag
    setTimeout(() => {
      const params = new URLSearchParams({ gitsync: 'true' })
      if (installationId) params.set('installation_id', installationId)
      router.push(`/?${params.toString()}`)
    }, 1500)
  }

  const validateAndPrepare = async (token: string, repoUrl: string) => {
    try {
      setStatus('loading')
      setMessage('Validando token do GitHub...')

      // 1. Validar token
      const validateRes = await projectService.validateGithubToken(token)

      if (!validateRes?.success || !validateRes.data?.valid) {
        setStatus('error')
        setMessage('Token inválido ou expirado. Tente gerar um novo token.')
        return
      }

      setMessage('Token válido! Preparando importação...')

      // 2. Salvar token em sessionStorage (temporary, durante a sessão)
      try {
        sessionStorage.setItem('github_token_temp', token)
      } catch {
        // ignore storage errors
      }

      setMessage('Redirecionando para importação...')
      setStatus('success')

      // 3. Redirecionar de volta para o projeto com token
      const params = new URLSearchParams({
        repo: repoUrl,
        token: token,
        auto: 'true'
      })

      // Pequeno delay para UX (mostra mensagem de sucesso)
      setTimeout(() => {
        router.push(`/?${params.toString()}`)
      }, 1500)
    } catch (error: unknown) {
      console.error('Erro na validação:', error)
      setStatus('error')
      setMessage('Erro ao validar token. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">Processando...</h2>
            <p className="text-center text-gray-600 text-sm">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">Token Validado! ✅</h2>
            <p className="text-center text-gray-600 text-sm">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">⚠️ Erro</h2>
            <p className="text-center text-gray-600 text-sm mb-4">{message}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Voltar para Projetos
            </button>
          </>
        )}

        {status === 'idle' && (
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-sm">Aguardando...</p>
          </div>
        )}
      </div>
    </div>
  )
}
