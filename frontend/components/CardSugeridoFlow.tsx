'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase'
import type { CardFeature } from '@/types'

type Status = 'idle' | 'streaming' | 'done' | 'error'

interface CardSugeridoFlowProps {
  projectId: string
  branch?: string
  onCardCreated: (card: CardFeature) => void
}

function getBaseURL(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api'
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://web-backend-10xdev.azurewebsites.net/api'
}

export default function CardSugeridoFlow({ projectId, branch, onCardCreated }: CardSugeridoFlowProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [steps, setSteps] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [generatedCard, setGeneratedCard] = useState<CardFeature | null>(null)

  function resetState() {
    setStatus('idle')
    setSteps([])
    setErrorMsg(null)
    setElapsedSeconds(0)
    setGeneratedCard(null)
  }

  function handleClose() {
    if (status === 'streaming') return
    setOpen(false)
    setQuery('')
    resetState()
  }

  async function handleGenerate() {
    if (!query.trim() || status === 'streaming') return

    resetState()
    setStatus('streaming')

    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`${getBaseURL()}/projects/${projectId}/cards/generate-flow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ searchTerm: query.trim(), ...(branch ? { branch } : {}) })
      })

      if (!response.body) throw new Error('Resposta sem stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // eslint-disable-next-line no-constant-condition -- stream read loop with break
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          let event: { type: string; label?: string; message?: string; card?: CardFeature }
          try {
            event = JSON.parse(trimmed)
          } catch {
            continue
          }

          if (event.type === 'step' && event.label) {
            setSteps(prev => [...prev, event.label!])
          } else if (event.type === 'error' && event.message) {
            setErrorMsg(event.message)
            setStatus('error')
          } else if (event.type === 'done' && event.card) {
            clearInterval(interval)
            setGeneratedCard(event.card)
            setStatus('done')
            onCardCreated(event.card)
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao gerar card')
      setStatus('error')
    } finally {
      clearInterval(interval)
    }
  }

  const isStreaming = status === 'streaming'
  const isDone = status === 'done'
  const isError = status === 'error'
  const showProgress = isStreaming || isDone || isError

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => setOpen(true)}
        title="Gerar card de flow com IA"
      >
        <Sparkles className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar card de flow</DialogTitle>
          </DialogHeader>

          {!showProgress ? (
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-sm text-gray-500">
                Qual funcionalidade você quer ver? A IA vai buscar no código importado e montar o card com o fluxo completo.
              </p>
              <Input
                placeholder="Ex: sync, autenticação, upload de arquivo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate() }}
                autoFocus
              />
              <Button
                onClick={handleGenerate}
                disabled={!query.trim()}
                className="w-full gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Gerar card
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-2">
              {/* Steps */}
              <div className="bg-gray-50 rounded-lg border p-3 font-mono text-[11px] leading-relaxed space-y-1.5">
                {steps.map((step, i) => {
                  const isLast = i === steps.length - 1
                  const completed = isDone || !isLast
                  return (
                    <div key={i} className="flex items-start gap-2">
                      {completed ? (
                        <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <Loader2 className="h-3 w-3 text-blue-500 mt-0.5 shrink-0 animate-spin" />
                      )}
                      <span className={completed ? 'text-gray-600' : 'text-blue-700 font-medium'}>{step}</span>
                    </div>
                  )
                })}

                {isStreaming && steps.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-purple-600">
                    <span className="flex gap-0.5">
                      <span className="animate-bounce [animation-delay:0ms]">●</span>
                      <span className="animate-bounce [animation-delay:150ms]">●</span>
                      <span className="animate-bounce [animation-delay:300ms]">●</span>
                    </span>
                    <span>IA processando...{elapsedSeconds > 0 ? ` (${elapsedSeconds}s)` : ''}</span>
                  </div>
                )}

                {isDone && (
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-green-600 font-medium">
                    <Check className="h-3 w-3" />
                    Card gerado com sucesso
                  </div>
                )}


                {isError && errorMsg && (
                  <div className="flex items-start gap-2 pt-1 text-[11px] text-red-600">
                    <X className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              {isDone && generatedCard && (
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    setOpen(false)
                    setQuery('')
                    resetState()
                    document.getElementById(`card-${generatedCard.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Ver card
                </Button>
              )}

              {isError && (
                <Button variant="outline" size="sm" onClick={resetState} className="w-full">
                  Tentar novamente
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
