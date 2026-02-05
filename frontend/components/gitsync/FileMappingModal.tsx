'use client'

import { useState, useEffect } from 'react'
import { gitsyncService, type FileMapping, type GitHubConnection } from '@/services/gitsyncService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Link2, Unlink, Trash2, RefreshCw, FileCode } from 'lucide-react'

interface FileMappingModalProps {
  cardId: string
  connection: GitHubConnection | null
  onMappingChange?: () => void
}

export function FileMappingModal({ cardId, connection, onMappingChange }: FileMappingModalProps) {
  const [mappings, setMappings] = useState<FileMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [filePath, setFilePath] = useState('')
  const [branchName, setBranchName] = useState('')

  useEffect(() => {
    if (isOpen && cardId) {
      loadMappings()
    }
  }, [isOpen, cardId])

  async function loadMappings() {
    setLoading(true)
    try {
      const data = await gitsyncService.getCardMappings(cardId)
      setMappings(data)
      if (data.length > 0 && data[0].branchName) {
        setBranchName(data[0].branchName)
      } else if (connection) {
        setBranchName(connection.defaultBranch)
      }
    } catch (error) {
      console.error('Erro ao carregar mapeamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLinkFile() {
    if (!connection || !filePath.trim()) return

    setIsLinking(true)
    try {
      await gitsyncService.linkFileToCard(cardId, {
        connectionId: connection.id,
        filePath: filePath.trim(),
        branchName: branchName || connection.defaultBranch
      })
      setFilePath('')
      await loadMappings()
      onMappingChange?.()
    } catch (error) {
      console.error('Erro ao vincular arquivo:', error)
    } finally {
      setIsLinking(false)
    }
  }

  async function handleUnlinkFile(mappingId: string) {
    try {
      await gitsyncService.unlinkFileFromCard(cardId, mappingId)
      await loadMappings()
      onMappingChange?.()
    } catch (error) {
      console.error('Erro ao desvincular arquivo:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          <Link2 className='w-4 h-4 mr-2' />
          Vincular Arquivos
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Vincular Arquivos ao Card</DialogTitle>
        </DialogHeader>

        {connection ? (
          <>
            <div className='text-sm text-gray-600 mb-4'>
              Repositório: <span className='font-medium'>{connection.fullName}</span>
            </div>

            {loading ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2 className='w-6 h-6 animate-spin text-gray-400' />
              </div>
            ) : (
              <>
                <div className='space-y-4 max-h-60 overflow-y-auto'>
                  {mappings.length === 0 ? (
                    <p className='text-sm text-gray-500 text-center py-4'>
                      Nenhum arquivo vinculado a este card
                    </p>
                  ) : (
                    mappings.map(mapping => (
                      <div
                        key={mapping.id}
                        className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                      >
                        <div className='flex items-center gap-2 overflow-hidden'>
                          <FileCode className='w-4 h-4 text-gray-500 flex-shrink-0' />
                          <span className='text-sm font-medium truncate'>
                            {mapping.filePath}
                          </span>
                        </div>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleUnlinkFile(mapping.id)}
                          className='text-red-600 hover:text-red-800'
                        >
                          <Unlink className='w-4 h-4' />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className='border-t pt-4 mt-4'>
                  <Label htmlFor='filePath'>Novo arquivo</Label>
                  <div className='flex gap-2 mt-1'>
                    <Input
                      id='filePath'
                      placeholder='src/controllers/example.ts'
                      value={filePath}
                      onChange={e => setFilePath(e.target.value)}
                      className='flex-1'
                    />
                    <Button
                      onClick={handleLinkFile}
                      disabled={isLinking || !filePath.trim()}
                      size='icon'
                    >
                      {isLinking ? (
                        <Loader2 className='w-4 h-4 animate-spin' />
                      ) : (
                        <Link2 className='w-4 h-4' />
                      )}
                    </Button>
                  </div>
                  <p className='text-xs text-gray-500 mt-1'>
                    Digite o caminho do arquivo no repositório
                  </p>
                </div>
              </>
            )}
          </>
        ) : (
          <div className='text-center py-8 text-gray-500'>
            <p>Nenhuma conexão GitHub estabelecida.</p>
            <p className='text-sm mt-1'>
              Conecte o projeto ao GitHub primeiro.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
