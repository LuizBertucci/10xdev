import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { getTechConfig, getLanguageConfig } from "./utils/techConfigs"
import ContentRenderer from "./ContentRenderer"
import type { CardFeature as CardFeatureType } from "@/types"

interface CardFeatureCompactProps {
  snippet: CardFeatureType
  onEdit: (snippet: CardFeatureType) => void
  onDelete: (snippetId: string) => void
  className?: string
}

export default function CardFeatureCompact({ snippet, onEdit, onDelete, className }: CardFeatureCompactProps) {
  // Estado para controlar se o código está expandido
  const [isExpanded, setIsExpanded] = useState(false)
  // Estado para controlar a aba ativa (similar ao CardFeature)
  const [activeTab, setActiveTab] = useState(0)
  
  // URL da API em produção
  const cardApiUrl = `https://web-backend-10xdev.azurewebsites.net/api/card-features/${snippet.id}`

  // Função para alternar o estado de expansão
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
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
                  {/* Autor à esquerda */}
                  <Badge
                    variant="secondary"
                    className="text-xs rounded-md shadow-sm border border-gray-300 bg-gray-50 text-gray-700"
                  >
                    <span className="mr-1">👤</span>
                    {snippet.author || 'Anônimo'}
                  </Badge>
                  
                  {/* Badges tech/language à direita */}
                  <div className="flex gap-2 ml-auto">
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
                  </div>
                </div>
              </div>

              {/* Layout Mobile - Vertical */}
              <div className="md:hidden space-y-3">
                {/* Informações */}
                <div className="pb-2 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 leading-snug break-words">{snippet.title}</h3>
                  {/* Descrição ocultada no mobile para economizar espaço */}
                  <a
                    href={cardApiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 mt-2 font-mono block underline"
                    title={`Abrir card na API: ${snippet.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {cardApiUrl.length > 30 ? `${cardApiUrl.substring(0, 30)}...` : cardApiUrl}
                  </a>
                </div>

                {/* Badges - Com wrap para não quebrar */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Autor */}
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border border-gray-300 bg-gray-50 text-gray-700"
                  >
                    <span className="mr-1">👤</span>
                    {snippet.author || 'Anônimo'}
                  </Badge>
                  
                  {/* Badges tech/language */}
                  <div className="flex flex-wrap gap-1.5 ml-auto">
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
                </div>
              </div>
            </div>

            {/* Seção de Actions - Visível apenas no desktop */}
            <div className="hidden md:flex items-center gap-1 flex-shrink-0">

              {/* Edit Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(snippet)}
                    className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 p-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Editar CardFeature</p>
                </TooltipContent>
              </Tooltip>

              {/* Delete Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(snippet.id)}
                    className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Excluir CardFeature</p>
                </TooltipContent>
              </Tooltip>

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

            {/* Indicador de expansão para mobile */}
            <div className="md:hidden flex items-center text-gray-400 mt-1">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          </div>
          
          {/* Área de Código Condicional */}
          {isExpanded && (
            <div className="mt-2 md:mt-3 space-y-1.5 animate-in slide-in-from-top-2 duration-300 overflow-x-hidden">
              {/* Botões de ação para mobile */}
              <div className="md:hidden flex justify-start gap-1.5 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(snippet)}
                  className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(snippet.id)}
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>

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
              <div className="rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 px-2 md:px-3 pt-3 md:pt-4 pb-2 md:pb-3 min-h-[12rem] md:min-h-[18rem] resize-y overflow-hidden relative group bg-white">
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

                <div className="codeblock-scroll relative z-10 h-full overflow-y-auto overflow-x-hidden -mx-2 md:-mx-3 px-2 md:px-3 pt-0">
                  <ContentRenderer
                    blocks={activeScreen.blocks || []}
                    className="h-full max-w-full"
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