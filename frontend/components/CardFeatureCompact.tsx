import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Edit, Trash2, ChevronDown, ChevronUp, MoreVertical, Link2, Check, Lock, Share2 } from "lucide-react"
import { toast } from "sonner"
import { getTechConfig, getLanguageConfig } from "./utils/techConfigs"
import ContentRenderer from "./ContentRenderer"
import { useAuth } from "@/hooks/useAuth"
import CardReview from "./CardReview"
import type { CardFeature as CardFeatureType } from "@/types"

interface CardFeatureCompactProps {
  snippet: CardFeatureType
  onEdit: (snippet: CardFeatureType) => void
  onDelete: (snippetId: string) => void
  className?: string
}

export default function CardFeatureCompact({ snippet, onEdit, onDelete, className }: CardFeatureCompactProps) {
  const { user } = useAuth()
  // Estado para controlar se o código está expandido
  const [isExpanded, setIsExpanded] = useState(false)
  // Estado para controlar a aba ativa (similar ao CardFeature)
  const [activeTab, setActiveTab] = useState(0)
  // Estado para feedback de "copiado"
  const [copied, setCopied] = useState(false)
  
  // Verificar se o usuário é o criador do card
  const isOwner = user?.id === snippet.createdBy
  const canEdit = isOwner
  
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

  // Função para compartilhar card (copiar URL do frontend)
  const handleShareCard = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      // Gerar URL do frontend para visualizar o card
      const frontendUrl = `${window.location.origin}/?tab=codes&id=${snippet.id}`
      await navigator.clipboard.writeText(frontendUrl)
      toast.success("Link do card copiado!")
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

  return (
    <TooltipProvider>
      <Card className={`shadow-sm hover:shadow-md transition-shadow w-full overflow-hidden ${className || ''}`}>
        <CardContent className="p-3 md:p-4">
          {/* Layout Horizontal - Clicável no mobile */}
          <div
            className="flex items-start justify-between gap-3 md:gap-8 cursor-pointer md:cursor-default active:bg-gray-50 md:active:bg-transparent rounded-lg transition-colors"
            onClick={handleCardClick}
          >

            {/* Seção de Informações + Badges */}
            <div className="flex-1 min-w-0 pr-1 md:pr-6 overflow-hidden">
              {/* Layout Desktop - Horizontal */}
              <div className="hidden md:flex flex-col gap-2">
                {/* Informações */}
                <div className="flex-1 min-w-0 pb-1 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 truncate">{snippet.title}</h3>
                  <p className="text-sm text-gray-600 whitespace-normal">{snippet.description}</p>
                  <a
                    href={cardApiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 mt-1 font-mono truncate block underline"
                    title={`Abrir card na API: ${snippet.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {cardApiUrl}
                  </a>
                </div>

                {/* Badges - Própria linha abaixo */}
                <div className="flex items-center justify-between gap-2 flex-shrink-0">
                  {/* Autor e privacidade à esquerda */}
                  <div className="flex items-center gap-2">
                    {snippet.isPrivate && (
                      <Badge
                        variant="secondary"
                        className="text-xs rounded-md shadow-sm border border-orange-300 bg-orange-50 text-orange-700"
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        Privado
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="text-xs rounded-md shadow-sm border border-gray-300 bg-gray-50 text-gray-700"
                    >
                      <span className="mr-1">👤</span>
                      {snippet.author || (snippet.createdBy ? 'Usuário' : 'Anônimo')}
                    </Badge>
                  </div>
                  
                  {/* Badges tech/language e compartilhar à direita */}
                  <div className="flex items-center gap-2 ml-auto">
                    <Badge
                      className={`text-xs rounded-md shadow-sm border ${getTechConfig(snippet.tech).color}`}
                    >
                      <span className="mr-1">{getTechConfig(snippet.tech).icon}</span>
                      {snippet.tech}
                    </Badge>
                    <Badge
                      className={`text-xs rounded-md shadow-sm border ${getLanguageConfig(snippet.language).color}`}
                    >
                      <span className="mr-1 text-xs font-bold">{getLanguageConfig(snippet.language).icon}</span>
                      {snippet.language}
                    </Badge>
                    {/* Share Button - Desktop - Canto inferior direito */}
                    {!snippet.isPrivate && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShareCard}
                            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 p-1.5 h-6 w-6"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Compartilhar card</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                
                {/* Sistema de Reviews */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <CardReview cardId={snippet.id} compact={true} />
                </div>
              </div>

              {/* Layout Mobile - Vertical com ícones em linha */}
              <div className="md:hidden space-y-2">
                {/* Título com Menu */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 leading-snug break-words flex-1">{snippet.title}</h3>
                  {/* Menu ⋮ - Na altura do título */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!snippet.isPrivate && (
                        <DropdownMenuItem onClick={handleShareCard}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Compartilhar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => {
                          if (!canEdit) {
                            toast.error("Você não tem permissão para editar este card. Apenas o criador pode realizar esta ação.")
                            return
                          }
                          onEdit(snippet)
                        }}
                        className={!canEdit ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!canEdit) {
                            toast.error("Você não tem permissão para deletar este card. Apenas o criador pode realizar esta ação.")
                            return
                          }
                          onDelete(snippet.id)
                        }}
                        className={`text-red-600 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {snippet.isPrivate && (
                    <>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border border-orange-300 bg-orange-50 text-orange-700"
                      >
                        <Lock className="h-2.5 w-2.5 mr-0.5" />
                        Privado
                      </Badge>
                      <span className="text-gray-400 text-[8px]">●</span>
                    </>
                  )}
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
                  <Badge
                    className={`text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border ${getLanguageConfig(snippet.language).color}`}
                  >
                    <span className="mr-1 text-[10px] font-bold">{getLanguageConfig(snippet.language).icon}</span>
                    {snippet.language}
                  </Badge>
                </div>
                
                {/* Sistema de Reviews - Mobile */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <CardReview cardId={snippet.id} compact={true} />
                </div>
                
                {/* Linha separatória */}
                <div className="border-t border-gray-200 pt-2">
                  {/* Ícones em linha horizontal - alinhados à direita */}
                  <div className="flex items-center justify-end gap-2">
                    {/* Botão Copiar para IDE */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`h-7 px-2 text-xs ${copied ? 'text-green-600 border-green-300 bg-green-50' : 'text-gray-600 hover:text-blue-600 hover:border-blue-300'}`}
                      onClick={handleCopyUrl}
                    >
                      {copied ? <Check className="h-3 w-3 mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                      {copied ? 'Copiado!' : 'Copiar para IDE'}
                    </Button>
                    
                    {/* Toggle - extrema direita */}
                    <div className="text-gray-400 ml-1">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção de Actions - Visível apenas no desktop */}
            <div className="hidden md:flex items-center gap-1 flex-shrink-0">

              {/* Menu Dropdown - Desktop */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200 p-2"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (!canEdit) {
                        toast.error("Você não tem permissão para editar este card. Apenas o criador pode realizar esta ação.")
                        return
                      }
                      onEdit(snippet)
                    }}
                    className={!canEdit ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (!canEdit) {
                        toast.error("Você não tem permissão para deletar este card. Apenas o criador pode realizar esta ação.")
                        return
                      }
                      onDelete(snippet.id)
                    }}
                    className={`text-red-600 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Toggle Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleExpanded}
                    className="text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 p-2"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isExpanded ? "Recolher código" : "Expandir código"}</p>
                </TooltipContent>
              </Tooltip>
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