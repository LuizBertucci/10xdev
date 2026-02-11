import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Edit, Loader2, Sparkles, Trash2 } from "lucide-react"
import ContentRenderer from "./ContentRenderer"
import type { CardFeature } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogBodyDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { AIInstructions } from "@/components/AIInstructions"

interface CardFeatureModalProps {
  snippet: CardFeature | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (snippet: CardFeature) => void
  onDelete?: (snippetId: string) => void
  canGenerateSummary?: boolean
  isGeneratingSummary?: boolean
  onGenerateSummary?: (snippetId: string, prompt?: string) => void | Promise<void>
}

const SUMMARY_INSTRUCTIONS = [
  '## Regras de Negócio (clareza do resumo)',
  '- Explique a feature em linguagem simples, sem jargões',
  '- Título e descrição devem comunicar o problema que resolve e o benefício gerado',
  '- Não use nomes de arquivos/componentes no texto',
  '- Pense em quem usa a feature e qual fluxo principal ela habilita',
  '',
  '## Diretrizes do Resumo',
  '- Mantenha o formato atual (título, descrição, categoria/tecnologias, features, arquivos)',
  '- A descrição curta deve ser objetiva e fácil de entender por qualquer pessoa',
  '- As features devem refletir capacidades reais do card, sem detalhes de implementação'
].join('\n')

const SUMMARY_INSTRUCTIONS_ROWS = SUMMARY_INSTRUCTIONS.split('\n').length + 4
const SUMMARY_INSTRUCTIONS_LS_KEY = 'card-summary-instructions'

export default function CardFeatureModal({
  snippet,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canGenerateSummary = false,
  isGeneratingSummary = false,
  onGenerateSummary
}: CardFeatureModalProps) {
  if (!snippet) return null
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false)
  const [summaryInstructions, setSummaryInstructions] = useState(SUMMARY_INSTRUCTIONS)

  const normalizeScreenName = (name?: string) =>
    (name || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const isSummaryScreen = (name?: string) => {
    const normalized = normalizeScreenName(name)
    return normalized === 'resumo' || normalized === 'sumario' || normalized === 'visao geral'
  }

  const visibleScreens = useMemo(() => {
    let summaryAlreadyAdded = false

    return snippet.screens.reduce<typeof snippet.screens>((acc, screen) => {
      if (isSummaryScreen(screen.name)) {
        if (summaryAlreadyAdded) return acc
        summaryAlreadyAdded = true
        acc.push({ ...screen, name: 'Visão Geral' })
        return acc
      }

      acc.push(screen)
      return acc
    }, [])
  }, [snippet.screens])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SUMMARY_INSTRUCTIONS_LS_KEY)
      if (stored) setSummaryInstructions(stored)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SUMMARY_INSTRUCTIONS_LS_KEY, summaryInstructions)
    } catch {
      // ignore
    }
  }, [summaryInstructions])

  return (
    <>
      <Dialog open={showSummaryPrompt} onOpenChange={setShowSummaryPrompt}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Instruções do resumo</DialogTitle>
            <DialogBodyDescription>
              Ajuste o prompt para gerar um resumo mais claro e focado na feature.
            </DialogBodyDescription>
          </DialogHeader>
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
            <AIInstructions
              value={summaryInstructions}
              onChange={setSummaryInstructions}
              rows={SUMMARY_INSTRUCTIONS_ROWS}
              label="Instruções para o resumo"
              id={`summary-instructions-modal-${snippet.id}`}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSummaryPrompt(false)}
              disabled={isGeneratingSummary}
              className="h-9 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                setShowSummaryPrompt(false)
                if (onGenerateSummary) {
                  await onGenerateSummary(snippet.id, summaryInstructions)
                }
              }}
              disabled={isGeneratingSummary}
              className="h-9 px-4"
            >
              {isGeneratingSummary ? 'Gerando...' : 'Gerar resumo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-xl">{snippet.title}</DialogTitle>
                {snippet.description && (
                  <DialogDescription className="mt-1">{snippet.description}</DialogDescription>
                )}
              </div>
              {(onEdit || onDelete) && (
                <div className="flex gap-2 flex-shrink-0">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(snippet)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(snippet.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-6 pb-6">
            <div className="flex gap-6 h-full min-w-max">
              {visibleScreens.length === 0 ? (
                <div className="flex items-center justify-center w-full py-12 text-gray-500">
                  Nenhum conteúdo disponível
                </div>
              ) : (
                visibleScreens.map((screen, index) => (
                  <div key={index} className="flex-shrink-0 w-[300px] sm:w-[500px] h-full min-h-0 flex flex-col">
                    <div className="relative h-full min-h-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
                      {isSummaryScreen(screen.name) && onGenerateSummary && canGenerateSummary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowSummaryPrompt(true)}
                          disabled={isGeneratingSummary}
                          className="absolute right-3 top-3 h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
                          title={isGeneratingSummary ? "Gerando resumo..." : "Gerar resumo com IA"}
                        >
                          {isGeneratingSummary ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <ContentRenderer blocks={screen.blocks || []} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
