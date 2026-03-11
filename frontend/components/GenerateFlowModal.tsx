'use client'

import { useState, useEffect } from 'react'
import { GitBranch, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase'
import type { CardFeature, FlowItem } from '@/types'

type Status = 'idle' | 'streaming' | 'done' | 'error'

interface GenerateFlowModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  snippet: CardFeature
  onSuccess: (contents: FlowItem[]) => void
}

function getBaseURL(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api'
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.10xdev.com.br/api'
}

export default function GenerateFlowModal({ open, onOpenChange, snippet, onSuccess }: GenerateFlowModalProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [steps, setSteps] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  function resetState() {
    setStatus('idle')
    setSteps([])
    setErrorMsg(null)
    setElapsedSeconds(0)
  }

  function handleClose() {
    if (status === 'streaming') return
    onOpenChange(false)
    resetState()
  }

  async function handleGenerate() {
    if (status === 'streaming') return

    setStatus('streaming')
    setSteps(['Conectando ao servidor...'])
    setErrorMsg(null)
    setElapsedSeconds(0)

    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`${getBaseURL()}/card-features/${snippet.id}/flow/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({})
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

          let event: { type: string; label?: string; message?: string; contents?: FlowItem[] }
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
          } else if (event.type === 'done' && Array.isArray(event.contents)) {
            clearInterval(interval)
            setSteps(prev => [...prev, 'Flow gerado com sucesso!'])
            setStatus('done')
            onSuccess(event.contents)
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao gerar flow')
      setStatus('error')
    } finally {
      clearInterval(interval)
    }
  }

  const isStreaming = status === 'streaming'
  const isDone = status === 'done'
  const isError = status === 'error'

  useEffect(() => {
    if (open) {
      handleGenerate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run when modal opens
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-green-600" />
            Gerar Flow
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
            <div className="bg-gray-50 rounded-lg border p-3 font-mono text-[11px] leading-relaxed space-y-1.5">
              {steps.map((step, i) => {
                const isLast = i === steps.length - 1
                const completed = isDone || isError || !isLast
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
                <div className="flex items-center gap-2 pt-1 text-[10px] text-green-600">
                  <span className="flex gap-0.5">
                    <span className="animate-bounce [animation-delay:0ms]">●</span>
                    <span className="animate-bounce [animation-delay:150ms]">●</span>
                    <span className="animate-bounce [animation-delay:300ms]">●</span>
                  </span>
                  <span>Processando...{elapsedSeconds > 0 ? ` (${elapsedSeconds}s)` : ''}</span>
                </div>
              )}

              {isDone && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-green-600 font-medium">
                  <Check className="h-3 w-3" />
                  Flow gerado com sucesso
                </div>
              )}

              {isError && errorMsg && (
                <div className="flex items-start gap-2 pt-1 text-[11px] text-red-600">
                  <X className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {isDone && (
              <Button className="w-full gap-2" onClick={handleClose}>
                <Check className="h-4 w-4" />
                Fechar
              </Button>
            )}

            {isError && (
              <Button variant="outline" size="sm" onClick={resetState} className="w-full">
                Tentar novamente
              </Button>
            )}
          </div>
      </DialogContent>
    </Dialog>
  )
}
