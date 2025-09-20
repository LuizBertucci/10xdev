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
}

export default function CardFeatureCompact({ snippet, onEdit, onDelete }: CardFeatureCompactProps) {
  // Estado para controlar se o código está expandido
  const [isExpanded, setIsExpanded] = useState(false)
  // Estado para controlar a aba ativa (similar ao CardFeature)
  const [activeTab, setActiveTab] = useState(0)

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
      <Card className="shadow-sm hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
        <CardContent className="p-3 md:p-4">
          {/* Layout Horizontal - Clicável no mobile */}
          <div
            className="flex items-center justify-between gap-4 cursor-pointer md:cursor-default"
            onClick={handleCardClick}
          >

            {/* Seção de Informações + Badges */}
            <div className="flex-1 min-w-0">
              {/* Layout Desktop - Horizontal */}
              <div className="hidden md:flex items-center gap-4">
                {/* Informações */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{snippet.title}</h3>
                  <p className="text-sm text-gray-600 truncate">{snippet.description}</p>
                </div>

                {/* Badges */}
                <div className="flex gap-2 flex-shrink-0">
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

              {/* Layout Mobile - Vertical */}
              <div className="md:hidden">
                {/* Informações */}
                <div className="mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{snippet.title}</h3>
                  <p className="text-sm text-gray-600 truncate">{snippet.description}</p>
                </div>

                {/* Badges */}
                <div className="flex gap-2">
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
            <div className="md:hidden flex items-center text-gray-400">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          </div>
          
          {/* Área de Código Condicional */}
          {isExpanded && (
            <div className="mt-3 md:mt-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
              {/* Botões de ação para mobile */}
              <div className="md:hidden flex justify-start gap-2 mb-3">
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
              <div className="compact-tabs-scroll flex gap-2 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg overflow-x-auto">
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
              <div className="rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-200 px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 h-64 md:h-96 overflow-y-auto relative group bg-white"
              >
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


                <div className="codeblock-scroll relative z-10 h-full overflow-y-auto -mx-4 md:-mx-6 px-4 md:px-6 pt-0">
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