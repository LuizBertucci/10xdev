import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Edit, Trash2, ChevronDown, ChevronUp, MoreVertical, Link2, Check, Globe, Lock } from "lucide-react"
import { VisibilityTab } from "./VisibilityTab"
import { toast } from "sonner"
import { getTechConfig, getLanguageConfig } from "./utils/techConfigs"
import ContentRenderer from "./ContentRenderer"
import { useAuth } from "@/hooks/useAuth"
import { useCardTabState } from "@/hooks/useCardTabState"
import type { CardFeature as CardFeatureType } from "@/types"
import { Visibility } from "@/types"

interface CardFeatureCompactProps {
  snippet: CardFeatureType
  onEdit: (snippet: CardFeatureType) => void
  onDelete: (snippetId: string) => void
  onUpdate?: (id: string, data: Partial<CardFeatureType>) => Promise<any>
  className?: string
}

export default function CardFeatureCompact({ snippet, onEdit, onDelete, onUpdate, className }: CardFeatureCompactProps) {
  const { user } = useAuth()
  // Estado para controlar se o código está expandido
  const [isExpanded, setIsExpanded] = useState(false)
  // Estado para controlar a aba ativa - persiste na URL
  const { activeTab, setActiveTab } = useCardTabState(snippet.id)
  // Estado para feedback de "copiado"
  const [copied, setCopied] = useState(false)
  
  const canEdit = user?.role === 'admin' || (!!user?.id && snippet.createdBy === user.id)
  
  // URL da API baseada no ambiente
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:3001/api'
    : 'https://api.10xdev.com.br/api'
  const cardApiUrl = `${apiBaseUrl}/card-features/${snippet.id}`

  // Função para alternar o estado de expansão
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Função para copiar URL
  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(cardApiUrl)
      setCopied(true)
      toast.success("Link copiado!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Erro ao copiar link")
    }
  }

  // Função para lidar com cliques no card (mobile)
  const handleCardClick = (e: React.MouseEvent) => {
    // Previne o toggle se clicou em um botão (desktop)
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    toggleExpanded()
  }

  // Screen ativa baseada na tab selecionada
  const activeScreen = snippet.screens[activeTab] || snippet.screens[0]

  // Função para mudar visibilidade rapidamente
  const handleVisibilityChange = async (newVisibility: Visibility) => {
    if (!onUpdate || !canEdit) return
    
    try {
      await onUpdate(snippet.id, { visibility: newVisibility })
      toast.success(`Visibilidade alterada para ${
        newVisibility === Visibility.PUBLIC ? (user?.role === 'admin' ? 'Público' : 'Validando') : 
        newVisibility === Visibility.PRIVATE ? 'Privado' : 'Não Listado'
      }`)
    } catch (err) {
      toast.error("Erro ao alterar visibilidade")
    }
  }

  const VisibilityDropdown = ({ size = 'default' }: { size?: 'default' | 'small' }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <VisibilityTab 
          visibility={snippet.visibility} 
          isPrivate={snippet.isPrivate} 
          approvalStatus={(snippet as any).approvalStatus}
          size={size} 
          isClickable={canEdit}
        />
      </DropdownMenuTrigger>
      {canEdit && (
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => handleVisibilityChange(Visibility.PUBLIC)} className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-600" />
            <span>{user?.role === 'admin' ? 'Público' : 'Enviar para aprovação'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleVisibilityChange(Visibility.UNLISTED)} className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            <span>Não Listado</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleVisibilityChange(Visibility.PRIVATE)} className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-orange-600" />
            <span>Privado</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )

  return (
    <TooltipProvider>
      <Card className={`shadow-sm hover:shadow-md transition-shadow w-full overflow-hidden ${className || ''}`}>
        <CardContent className="p-3 md:p-4">
          {/* Layout Unificado - Vertical para mobile e desktop */}
          <div
            className="cursor-pointer active:bg-gray-50 rounded-lg transition-colors"
            onClick={handleCardClick}
          >
            <div className="space-y-2">
              {/* Título com Menu */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 leading-snug break-words flex-1">
                  {snippet.title}
                </h3>
                {/* Menu ⋮ - Na altura do título */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(snippet)} disabled={!canEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(snippet.id)}
                      className="text-red-600"
                      disabled={!canEdit}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Descrição (opcional) */}
              {snippet.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{snippet.description}</p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border border-gray-300 bg-gray-50 text-gray-700"
                >
                  <span className="mr-1">👤</span>
                  {snippet.author || (snippet.createdBy ? 'Usuário' : 'Anônimo')}
                </Badge>
                <span className="text-gray-400 text-[8px]">●</span>
                <Badge
                  className={`text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border ${getTechConfig(snippet.tech).color}`}
                >
                  <span className="mr-1">{getTechConfig(snippet.tech).icon}</span>
                  {snippet.tech}
                </Badge>
                {snippet.language.toLowerCase() !== snippet.tech.toLowerCase() && (
                  <Badge
                    className={`text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border ${getLanguageConfig(snippet.language).color}`}
                  >
                    <span className="mr-1 text-[10px] font-bold">{getLanguageConfig(snippet.language).icon}</span>
                    {snippet.language}
                  </Badge>
                )}
              </div>
              
              {/* Linha separatória */}
              <div className="border-t border-gray-200 pt-2">
                {/* Ícones em linha horizontal - alinhados à direita */}
                <div className="flex items-center justify-between gap-2">
                  {/* Badge de Visibilidade (Lado Esquerdo) */}
                  <div className="flex-shrink-0">
                    <VisibilityDropdown size="small" />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botão Link do card */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`h-7 px-2 text-xs ${copied ? 'text-green-600 border-green-300 bg-green-50' : 'text-gray-600 hover:text-blue-600 hover:border-blue-300'}`}
                      onClick={handleCopyUrl}
                    >
                      {copied ? <Check className="h-3 w-3 mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                      {copied ? 'Copiado!' : 'Link do card'}
                    </Button>

                    {/* Toggle - extrema direita */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpanded()
                          }}
                          className="text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all duration-200 p-1 h-7 w-7"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isExpanded ? "Recolher código" : "Expandir código"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Área de Código Condicional */}
          {isExpanded && (
            <div className="mt-2 md:mt-3 space-y-1.5 animate-in slide-in-from-top-2 duration-300 overflow-x-hidden">
              {/* Sistema de Tabs */}
              <div className="compact-tabs-scroll flex gap-1.5 p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-md overflow-x-auto overflow-y-hidden">
                <style>{`
                  .compact-tabs-scroll::-webkit-scrollbar {
                    height: 6px;
                  }
                  .compact-tabs-scroll::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                  }
                  .compact-tabs-scroll::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 3px;
                  }
                  .compact-tabs-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.5);
                  }
                `}</style>
                {snippet.screens.map((screen, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTab(index)}
                    className={`
                      px-4 py-2 text-xs font-medium transition-all duration-300 rounded-lg relative flex-shrink-0 whitespace-nowrap
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

              {/* Área do Conteúdo com Containers Específicos */}
              <div className="rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 px-2 md:px-3 pt-3 md:pt-4 pb-2 md:pb-3 relative group bg-white">
                <style>{`
                  .codeblock-scroll::-webkit-scrollbar {
                    height: 8px;
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

                <div className="codeblock-scroll relative z-10 overflow-x-auto overflow-y-visible -mx-2 md:-mx-3 px-2 md:px-3 pt-0">
                  <ContentRenderer
                    blocks={activeScreen.blocks || []}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}