import { Bot, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

type GitSyncImportJob = {
  id: string
  status: string
  step: string
  progress: number
  message: string | null
  ai_requested: boolean
  ai_used: boolean
  ai_cards_created: number
  files_processed: number
  cards_created: number
}

type GitSyncProgressEvent = {
  id: string
  timestamp: number
  status: string
  progress: number
  message: string
}

type GitSyncProgressModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: GitSyncImportJob | null
  events: GitSyncProgressEvent[]
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export default function GitSyncProgressModal({
  open,
  onOpenChange,
  job,
  events
}: GitSyncProgressModalProps) {
  const status = job?.status ?? 'running'
  const statusLabel =
    status === 'done'
      ? 'Conexão concluída'
      : status === 'error'
        ? 'Falha na conexão'
        : 'Conectando repositório'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === 'running' ? (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            ) : status === 'done' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            {statusLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {job?.message || 'Iniciando conexão e importação...'}
              </span>
              <span className="font-medium">{job?.progress ?? 0}%</span>
            </div>
            <Progress value={job?.progress ?? 0} className="mt-2 h-2" />
          </div>

          {job && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-md border bg-muted/40 p-3 text-xs">
              <span>📁 {job.files_processed} arquivos</span>
              <span>🗂️ {job.cards_created} cards</span>
              {job.ai_requested && (
                <span className={job.ai_used ? 'text-green-700 font-medium' : 'text-blue-700'}>
                  <Bot className="mr-1 inline h-3 w-3" />
                  {job.ai_used ? `IA: ${job.ai_cards_created} cards` : 'IA: processando...'}
                </span>
              )}
            </div>
          )}

          <div className="rounded-md border">
            <div className="border-b bg-muted/30 px-3 py-2 text-sm font-medium">
              Eventos da conexão
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto p-3">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aguardando atualização do processo...
                </p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="rounded-md border bg-background px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{formatTime(event.timestamp)}</span>
                      <span>{event.progress}%</span>
                    </div>
                    <p className="mt-1 text-sm">{event.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
