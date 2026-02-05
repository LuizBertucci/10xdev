'use client'

import { useState } from 'react'
import { gitsyncService, type FileMapping, type GitHubConnection, type PullRequest } from '@/services/gitsyncService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Loader2, GitPullRequest, ExternalLink, AlertCircle, Check, Clock } from 'lucide-react'

interface SyncToGitHubButtonProps {
  cardId: string
  cardTitle: string
  connection: GitHubConnection | null
  mappings: FileMapping[]
  currentContent: string
  onSyncComplete?: () => void
}

export function SyncToGitHubButton({
  cardId,
  cardTitle,
  connection,
  mappings,
  currentContent,
  onSyncComplete
}: SyncToGitHubButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [syncResult, setSyncResult] = useState<{ prUrl: string; prNumber: number; branchName: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (open && connection) {
      loadPullRequests()
      setCommitMessage(`feat(${cardTitle}): update ${cardTitle}`)
      setSyncResult(null)
      setError(null)
    }
  }

  async function loadPullRequests() {
    if (!connection) return
    try {
      const prs = await gitsyncService.getPullRequests(connection.id)
      setPullRequests(prs.filter(pr => pr.cardFeatureId === cardId))
    } catch (err) {
      console.error('Erro ao carregar PRs:', err)
    }
  }

  async function handleSync() {
    if (!connection || mappings.length === 0) return

    setIsSyncing(true)
    setError(null)

    try {
      const result = await gitsyncService.syncCardToGitHub(cardId, {
        newContent: currentContent,
        commitMessage: commitMessage || `feat(${cardTitle}): update ${cardTitle}`
      })
      setSyncResult({
        prUrl: result.prUrl,
        prNumber: result.prNumber,
        branchName: result.branchName
      })
      onSyncComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant='default' size='sm' disabled={!connection}>
          <GitPullRequest className='w-4 h-4 mr-2' />
          Salvar no GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Sincronizar com GitHub</DialogTitle>
        </DialogHeader>

        {!connection ? (
          <div className='text-center py-8 text-gray-500'>
            <AlertCircle className='w-8 h-8 mx-auto mb-2 text-yellow-500' />
            <p>Nenhuma conexão GitHub estabelecida.</p>
            <p className='text-sm mt-1'>
              Conecte o projeto ao GitHub primeiro.
            </p>
          </div>
        ) : mappings.length === 0 ? (
          <div className='text-center py-8 text-gray-500'>
            <AlertCircle className='w-8 h-8 mx-auto mb-2 text-yellow-500' />
            <p>Nenhum arquivo vinculado a este card.</p>
            <p className='text-sm mt-1'>
              Vincule pelo menos um arquivo antes de sincronizar.
            </p>
          </div>
        ) : (
          <>
            {syncResult ? (
              <div className='text-center py-6'>
                <div className='flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4'>
                  <Check className='w-6 h-6 text-green-600' />
                </div>
                <h3 className='font-medium text-lg mb-2'>Pull Request Criado!</h3>
                <p className='text-sm text-gray-600 mb-4'>
                  PR #{syncResult.prNumber} criado a partir da branch{' '}
                  <code className='bg-gray-100 px-1 rounded'>{syncResult.branchName}</code>
                </p>
                <a
                  href={syncResult.prUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-2 text-blue-600 hover:text-blue-800'
                >
                  <ExternalLink className='w-4 h-4' />
                  Ver Pull Request no GitHub
                </a>
              </div>
            ) : (
              <>
                <div className='space-y-4'>
                  <div>
                    <Label htmlFor='commitMessage'>Mensagem do commit</Label>
                    <Input
                      id='commitMessage'
                      value={commitMessage}
                      onChange={e => setCommitMessage(e.target.value)}
                      placeholder='feat(card): update card content'
                      className='mt-1'
                    />
                  </div>

                  <div className='bg-gray-50 rounded-lg p-3'>
                    <h4 className='text-sm font-medium mb-2'>Arquivos que serão sincronizados:</h4>
                    <ul className='text-sm text-gray-600 space-y-1'>
                      {mappings.map(mapping => (
                        <li key={mapping.id} className='flex items-center gap-2'>
                          <span className='w-1.5 h-1.5 bg-blue-500 rounded-full' />
                          {mapping.filePath}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {error && (
                    <div className='flex items-center gap-2 text-red-600 text-sm'>
                      <AlertCircle className='w-4 h-4' />
                      {error}
                    </div>
                  )}

                  {pullRequests.length > 0 && (
                    <div className='border-t pt-4'>
                      <h4 className='text-sm font-medium mb-2'>Pull Requests anteriores:</h4>
                      <div className='space-y-2'>
                        {pullRequests.map(pr => (
                          <a
                            key={pr.id}
                            href={pr.prUrl || '#'}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100'
                          >
                            <span className='text-sm text-gray-700'>
                              #{pr.prNumber} - {pr.prTitle}
                            </span>
                            {pr.mergedAt ? (
                              <span className='text-xs text-purple-600 flex items-center gap-1'>
                                <Check className='w-3 h-3' />
                                Mesclado
                              </span>
                            ) : (
                              <span className='text-xs text-yellow-600 flex items-center gap-1'>
                                <Clock className='w-3 h-3' />
                                Aberto
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className='mt-6'>
                  <Button variant='outline' onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className='gap-2'
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className='w-4 h-4 animate-spin' />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <GitPullRequest className='w-4 h-4' />
                        Criar Pull Request
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
