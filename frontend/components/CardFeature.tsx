import { useState, useCallback, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Expand, Edit, Trash2, Lock, Link2, Sparkles, Loader2 } from "lucide-react"
import { cardFeatureService } from '@/services/cardFeatureService'
import { getTechConfig, getLanguageConfig } from "./utils/techConfigs"
import ContentRenderer from "./ContentRenderer"
import { useAuth } from "@/hooks/useAuth"
import type { CardFeature as CardFeatureType } from "@/types"
import { Visibility, ContentType } from "@/types"
import { toast } from "sonner"
import { AIInstructions } from "@/components/AIInstructions"

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

interface CardFeatureProps {
  snippet: CardFeatureType
  onEdit: (snippet: CardFeatureType) => void
  onExpand: (snippetId: string) => void
  onDelete: (snippetId: string) => void
}

export default function CardFeature({ snippet, onEdit, onExpand, onDelete }: CardFeatureProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false)
  const [summaryInstructions, setSummaryInstructions] = useState(SUMMARY_INSTRUCTIONS)
  const techValue = snippet.tech ?? "Geral"
  const languageValue = snippet.language ?? "text"
  const isOwner = user?.id === snippet.createdBy
  const canEdit = isOwner

  const normalizeScreenName = (name?: string) =>
    (name || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const isVisaoGeralScreen = (name?: string) => {
    const normalized = normalizeScreenName(name)
    return normalized === 'resumo' || normalized === 'visao geral'
  }

  const visibleScreens = useMemo(() => {
    let summaryAlreadyAdded = false

    return snippet.screens.reduce<CardFeatureType['screens']>((acc, screen) => {
      if (isVisaoGeralScreen(screen.name)) {
        if (summaryAlreadyAdded) return acc
        summaryAlreadyAdded = true
        acc.push({ ...screen, name: 'Visão Geral' })
        return acc
      }

      acc.push(screen)
      return acc
    }, [])
  }, [snippet.screens])

  const activeScreen = visibleScreens[activeTab] || visibleScreens[0]

  // Cálculo local de acesso (evita chamada individual GET /access por card)
  const accessInfo = useMemo(() => {
    if (!user) return null
    return {
      canGenerate: user.role === 'admin',
      isOwner: user.id === snippet.createdBy,
      isAdmin: user.role === 'admin'
    }
  }, [user, snippet.createdBy])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SUMMARY_INSTRUCTIONS_LS_KEY)
      if (stored) setSummaryInstructions(stored)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SUMMARY_INSTRUCTIONS_LS_KEY, summaryInstructions)
    } catch { /* ignore */ }
  }, [summaryInstructions])

  const handleGenerateSummary = useCallback(async (prompt?: string) => {
    if (!accessInfo?.canGenerate || isGeneratingSummary) return
    setIsGeneratingSummary(true)
    try {
      const response = await cardFeatureService.generateSummary(
        snippet.id,
        true,
        prompt?.trim() || undefined
      )
      if (response.success) {
        const updatedScreens = response.summary
          ? [
              {
                name: 'Visão Geral',
                description: 'Resumo gerado por IA',
                blocks: [{ id: cardFeatureService.generateUUID(), type: ContentType.TEXT, content: response.summary, order: 0 }],
                route: ''
              },
              ...snippet.screens.filter((s) => !isVisaoGeralScreen(s.name))
            ]
          : snippet.screens
        onEdit({ ...snippet, screens: updatedScreens })
        toast.success('Resumo gerado com sucesso!')
      } else if (response.message === 'Resumo já existente') {
        toast.info('Resumo já existe para este card')
      } else {
        toast.error(response.message || 'Erro ao gerar resumo')
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 403) {
        toast.error('Você não tem permissão para gerar resumo deste card')
      } else {
        console.error('Erro ao gerar resumo:', error)
        toast.error('Erro ao gerar resumo')
      }
    } finally {
      setIsGeneratingSummary(false)
    }
  }, [accessInfo, isGeneratingSummary, snippet])

  return (
    <TooltipProvider>
      <Dialog open={showSummaryPrompt} onOpenChange={setShowSummaryPrompt}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Instruções do resumo</DialogTitle>
            <DialogDescription>
              Ajuste o prompt para gerar um resumo mais claro e focado na feature.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
            <AIInstructions
              value={summaryInstructions}
              onChange={setSummaryInstructions}
              rows={SUMMARY_INSTRUCTIONS_ROWS}
              label="Instruções para o resumo"
              id={`summary-instructions-${snippet.id}`}
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
              onClick={() => {
                setShowSummaryPrompt(false)
                handleGenerateSummary(summaryInstructions)
              }}
              disabled={isGeneratingSummary}
              className="h-9 px-4"
            >
              {isGeneratingSummary ? 'Gerando...' : 'Gerar resumo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="shadow-lg hover:shadow-xl transition-shadow h-[32rem]">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{snippet.title}</CardTitle>
                {/* Badge de Visibilidade */}
                {(snippet.visibility === Visibility.PRIVATE || snippet.isPrivate) && (
                  <Badge
                    variant="secondary"
                    className="text-xs rounded-md shadow-sm border border-orange-300 bg-orange-50 text-orange-700"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Privado
                  </Badge>
                )}
                {snippet.visibility === Visibility.UNLISTED && (
                  <Badge
                    variant="secondary"
                    className="text-xs rounded-md shadow-sm border border-blue-300 bg-blue-50 text-blue-700"
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    Não Listado
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm h-10 leading-5 overflow-hidden">
                {snippet.description || ''}
              </CardDescription>
              {snippet.createdBy && (
                <p className="text-xs text-gray-500 mt-1">
                  Por: {snippet.author || 'Usuário'}
                </p>
              )}
            </div>
            <div className="flex space-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(snippet)}
                    disabled={!canEdit}
                    className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{canEdit ? 'Editar CardFeature' : 'Apenas o criador pode editar'}</p>
                </TooltipContent>
              </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(snippet.id)}
                      disabled={!canEdit}
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{canEdit ? 'Excluir CardFeature' : 'Apenas o criador pode excluir'}</p>
                  </TooltipContent>
                </Tooltip>
                {/* Botão Gerar Resumo - apenas para usuários com acesso */}
{accessInfo?.canGenerate && (
  <Tooltip>
    <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSummaryPrompt(true)}
                      disabled={!accessInfo?.canGenerate || isGeneratingSummary}
                      className={`text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200 p-2 ${isGeneratingSummary ? 'animate-pulse' : ''}`}
                    >
        {isGeneratingSummary ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{isGeneratingSummary ? 'Gerando resumo...' : 'Gerar Resumo com IA'}</p>
    </TooltipContent>
  </Tooltip>
)}
              </div>
          </div>
        </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* Badges de tecnologia */}
          <div className="flex justify-end space-x-2">
            <Badge 
              className={`text-xs rounded-md shadow-sm border pointer-events-none ${getTechConfig(techValue).color}`}
            >
              <span className="mr-1">{getTechConfig(techValue).icon}</span>
              {techValue}
            </Badge>
            <Badge 
              className={`text-xs rounded-md shadow-sm border pointer-events-none ${getLanguageConfig(languageValue).color}`}
            >
              <span className="mr-1 text-xs font-bold">{getLanguageConfig(languageValue).icon}</span>
              {languageValue}
            </Badge>
          </div>

          {/* Sistema de Abas + Preview */}
          <div className="space-y-2">
            {/* Abas Header - SEMPRE VISÍVEL com scroll horizontal */}
            <div className="p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg overflow-hidden">
              <div className="tabs-scroll flex gap-2 overflow-x-auto pb-1">
                <style>{`
                  .tabs-scroll::-webkit-scrollbar {
                    height: 6px;
                  }
                  .tabs-scroll::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                  }
                  .tabs-scroll::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 3px;
                  }
                  .tabs-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.5);
                  }
                `}</style>
                {visibleScreens.map((screen, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTab(index)}
                    className={`
                      px-4 py-2 text-xs font-medium transition-all duration-300 rounded-lg relative whitespace-nowrap flex-shrink-0
                      ${activeTab === index 
                        ? 'text-gray-700 bg-white shadow-md transform scale-105 font-semibold' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:shadow-sm hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {screen.name || `Aba ${index + 1}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview do Conteúdo - Aba Ativa com Containers Específicos */}
            <div className="rounded-xl shadow-xl px-6 pt-6 pb-4 h-[19rem] overflow-y-auto relative group bg-white border border-gray-200">
              <style>{`
                .codeblock-scroll::-webkit-scrollbar {
                  width: 8px;
                }
                .codeblock-scroll::-webkit-scrollbar-track {
                  background: rgba(0, 0, 0, 0.1);
                  border-radius: 4px;
                }
                .codeblock-scroll::-webkit-scrollbar-thumb {
                  background: rgba(0, 0, 0, 0.3);
                  border-radius: 4px;
                }
                .codeblock-scroll::-webkit-scrollbar-thumb:hover {
                  background: rgba(0, 0, 0, 0.5);
                }
              `}</style>
              
              {/* Botões no canto superior direito */}
              <div className="absolute top-2 right-4 z-20">
                <div className="flex space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(snippet)}
                      className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 p-2 opacity-80 hover:opacity-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Editar CardFeature</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExpand(snippet.id)}
                      className="text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 p-2 opacity-80 hover:opacity-100"
                    >
                      <Expand className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tela cheia</p>
                  </TooltipContent>
                </Tooltip>
                </div>
              </div>
              
              <div className="codeblock-scroll relative z-10 h-full overflow-y-auto -mx-6 px-6 pt-2">
                <ContentRenderer
                  blocks={activeScreen.blocks || []}
                  className="h-full"
                />
              </div>
              {/* <div className="absolute inset-0 opacity-60 group-hover:opacity-30 transition-opacity" style={{background: 'linear-gradient(to top, #374151 0%, transparent 50%, transparent 100%)'}}></div> */}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  )
}