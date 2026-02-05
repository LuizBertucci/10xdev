'use client'

// ============================================
// GITHUB CONNECT BUTTON
// ============================================
// Componente de UI para conectar/desconectar um projeto ao GitHub:
// - Exibe status de conexão (conectado/desconectado)
// - Botão para iniciar OAuth flow
// - Botão para desconectar
// - Link para o repositório no GitHub

import { useState, useEffect } from 'react'
import { gitsyncService, type GitHubConnection } from '@/services/gitsyncService'
import { GitBranch, Link2, RefreshCw, ExternalLink, Check, X } from 'lucide-react'

// ============================================
// PROPS
// ============================================

interface GitHubConnectButtonProps {
  projectId: string
  onConnected?: (connection: GitHubConnection) => void
  onDisconnected?: () => void
}

// ============================================
// COMPONENT
// ============================================

export function GitHubConnectButton({ projectId, onConnected, onDisconnected }: GitHubConnectButtonProps) {
  /**
   * Conexão atual (null se não conectado)
   */
  const [connection, setConnection] = useState<GitHubConnection | null>(null)

  /**
   * Estado de carregamento inicial
   */
  const [loading, setLoading] = useState(true)

  /**
   * Estado de conexão OAuth em andamento
   */
  const [connecting, setConnecting] = useState(false)

  /**
   * Carrega a conexão ao montar o componente
   */
  useEffect(() => {
    loadConnection()
  }, [projectId])

  /**
   * Busca a conexão do projeto no servidor
   */
  async function loadConnection() {
    try {
      const connections = await gitsyncService.getConnections(projectId)
      if (connections.length > 0) {
        setConnection(connections[0])
      }
    } catch (error) {
      console.error('Erro ao carregar conexão:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Inicia o fluxo OAuth
   * Redireciona para a página de autorização do GitHub
   */
  async function handleConnect() {
    setConnecting(true)
    try {
      const { authUrl } = await gitsyncService.getAuthorizationUrl(projectId)
      window.location.href = authUrl
    } catch (error) {
      console.error('Erro ao gerar URL de autorização:', error)
      setConnecting(false)
    }
  }

  /**
   * Desconecta o repositório GitHub
   * Remove tokens e a conexão
   */
  async function handleDisconnect() {
    if (!confirm('Tem certeza que deseja desconectar o repositório GitHub?')) {
      return
    }

    try {
      await gitsyncService.disconnect()
      await gitsyncService.deleteConnection(connection!.id)
      setConnection(null)
      onDisconnected?.()
    } catch (error) {
      console.error('Erro ao desconectar:', error)
    }
  }

  /**
   * Estado de carregamento
   */
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Carregando...
      </div>
    )
  }

  /**
   * Estado conectado
   * Exibe informações do repositório e botões de ação
   */
  if (connection) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
        {/* Ícone e nome do repositório */}
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {connection.fullName}
          </span>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Badge de status */}
          {connection.isActive && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3 h-3" />
              Conectado
            </span>
          )}

          {/* Link para o repositório no GitHub */}
          <a
            href={`https://github.com/${connection.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-3 h-3" />
            Ver no GitHub
          </a>

          {/* Botão de desconectar */}
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
          >
            <X className="w-3 h-3" />
            Desconectar
          </button>
        </div>
      </div>
    )
  }

  /**
   * Estado desconectado
   * Exibe botão para conectar
   */
  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {connecting ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Conectando...
        </>
      ) : (
        <>
          {/* Logo do GitHub */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Conectar GitHub
        </>
      )}
    </button>
  )
}
