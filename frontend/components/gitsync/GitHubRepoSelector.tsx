'use client'

import { useState, useEffect } from 'react'
import { gitsyncService, type GitHubRepo } from '@/services/gitsyncService'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, GitBranch, AlertCircle } from 'lucide-react'

interface GitHubRepoSelectorProps {
  projectId: string
  onSelect: (repo: GitHubRepo) => void
  selectedRepoFullName?: string
}

export function GitHubRepoSelector({ projectId, onSelect, selectedRepoFullName }: GitHubRepoSelectorProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRepositories()
  }, [projectId])

  async function loadRepositories() {
    setLoading(true)
    setError(null)
    try {
      const data = await gitsyncService.getUserRepos()
      setRepos(data)
    } catch (err) {
      setError('Erro ao carregar repositórios')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(fullName: string) {
    const repo = repos.find(r => r.full_name === fullName)
    if (repo) {
      onSelect(repo)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center gap-2 text-sm text-gray-500'>
        <Loader2 className='w-4 h-4 animate-spin' />
        Carregando repositórios...
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center gap-2 text-sm text-red-600'>
        <AlertCircle className='w-4 h-4' />
        {error}
        <button onClick={loadRepositories} className='underline ml-1'>
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <Select value={selectedRepoFullName} onValueChange={handleSelect}>
      <SelectTrigger className='w-full'>
        <SelectValue placeholder='Selecione um repositório' />
      </SelectTrigger>
      <SelectContent>
        {repos.map(repo => (
          <SelectItem key={repo.id} value={repo.full_name}>
            <div className='flex items-center gap-2'>
              <GitBranch className='w-4 h-4 text-gray-500' />
              <span>{repo.full_name}</span>
              {repo.private && (
                <span className='text-xs text-gray-400'>Privado</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
